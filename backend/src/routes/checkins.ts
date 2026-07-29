import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { MailerNotConfiguredError, sendCheckInSummaryEmail } from "../utils/mailer";
import { shouldCreateRecurringSuccessor } from "../utils/talkingPointRecurrence";

const router = Router();

const sendSummarySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

const actionItemInput = z.object({
  id: z.string().optional(), // present if updating an existing (e.g. carried-over) item
  description: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  dueDate: z.string().datetime().optional().nullable(),
});

const talkingPointInput = z.object({
  id: z.string().optional(), // present if updating an existing (e.g. carried-over) point
  content: z.string().min(1),
  resolved: z.boolean().default(false),
  recurring: z.boolean().default(false),
});

const createSchema = z.object({
  teamMemberId: z.string().min(1),
  scheduledDate: z.string().datetime(),
});

const draftSchema = z.object({
  wins: z.string().optional(),
  challenges: z.string().optional(),
  decisions: z.string().optional(),
  growthNotes: z.string().optional(),
  energyLevel: z.number().int().min(1).max(5).optional().nullable(),
  actionItems: z.array(actionItemInput).default([]),
  talkingPoints: z.array(talkingPointInput).default([]),
  deletedActionItemIds: z.array(z.string()).default([]),
  deletedTalkingPointIds: z.array(z.string()).default([]),
});

// Shared by /save (draft, stays SCHEDULED) and /complete (marks COMPLETED).
// Persists notes plus any action-item/talking-point edits made in the form.
async function applyCheckInUpdate(
  checkIn: { id: string; teamMemberId: string },
  data: z.infer<typeof draftSchema>,
  { complete }: { complete: boolean }
) {
  const {
    wins,
    challenges,
    decisions,
    growthNotes,
    energyLevel,
    actionItems,
    talkingPoints,
    deletedActionItemIds,
    deletedTalkingPointIds,
  } = data;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.checkIn.update({
      where: { id: checkIn.id },
      data: {
        wins,
        challenges,
        decisions,
        growthNotes,
        energyLevel,
        ...(complete ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });

    if (deletedActionItemIds.length > 0) {
      await tx.actionItem.updateMany({
        where: {
          id: { in: deletedActionItemIds },
          teamMemberId: checkIn.teamMemberId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    }

    if (deletedTalkingPointIds.length > 0) {
      await tx.talkingPoint.updateMany({
        where: {
          id: { in: deletedTalkingPointIds },
          teamMemberId: checkIn.teamMemberId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    }

    for (const item of actionItems) {
      if (item.id) {
        const existing = await tx.actionItem.findUnique({
          where: { id: item.id },
          include: { carriedOverTo: true },
        });

        if (!existing || existing.teamMemberId !== checkIn.teamMemberId || existing.deletedAt) {
          throw new Error(`Action item ${item.id} does not belong to this team member`);
        }

        const itemData = {
          description: item.description,
          status: item.status,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          completedAt: item.status === "DONE" ? new Date() : null,
        };

        if (existing.checkInId === checkIn.id) {
          // This item already belongs to the current check-in, so editing it
          // does not change any historical association.
          await tx.actionItem.update({
            where: { id: existing.id },
            data: itemData,
          });
        } else if (existing.carriedOverTo?.checkInId === checkIn.id) {
          // Make saving/completing safe to retry without creating another
          // successor for the same historical item.
          await tx.actionItem.update({
            where: { id: existing.carriedOverTo.id },
            data: itemData,
          });
        } else if (existing.carriedOverTo) {
          throw new Error(`Action item ${item.id} has already been carried over`);
        } else {
          // Preserve the prior item under its original check-in and record a
          // linked successor under this check-in.
          await tx.actionItem.create({
            data: {
              ...itemData,
              teamMemberId: checkIn.teamMemberId,
              checkInId: checkIn.id,
              carriedOverFromId: existing.id,
            },
          });
        }
      } else {
        await tx.actionItem.create({
          data: {
            description: item.description,
            status: item.status,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            completedAt: item.status === "DONE" ? new Date() : null,
            teamMemberId: checkIn.teamMemberId,
            checkInId: checkIn.id,
          },
        });
      }
    }

    for (const point of talkingPoints) {
      let savedPointId: string;
      let successorExists = false;

      if (point.id) {
        const existing = await tx.talkingPoint.findUnique({
          where: { id: point.id },
          include: { renewedTo: true },
        });
        if (!existing || existing.teamMemberId !== checkIn.teamMemberId || existing.deletedAt) {
          throw new Error(`Talking point ${point.id} does not belong to this team member`);
        }

        const savedPoint = await tx.talkingPoint.update({
          where: { id: existing.id },
          data: {
            content: point.content,
            resolved: point.resolved,
            resolvedAt: point.resolved ? new Date() : null,
            recurring: point.recurring,
            // Attach previously unassigned points to their first check-in, but
            // never move a point away from an earlier historical check-in.
            ...(existing.checkInId === null ? { checkInId: checkIn.id } : {}),
          },
        });
        savedPointId = savedPoint.id;
        successorExists = !!existing.renewedTo;
      } else {
        const savedPoint = await tx.talkingPoint.create({
          data: {
            content: point.content,
            resolved: point.resolved,
            resolvedAt: point.resolved ? new Date() : null,
            recurring: point.recurring,
            teamMemberId: checkIn.teamMemberId,
            checkInId: checkIn.id,
          },
        });
        savedPointId = savedPoint.id;
      }

      if (
        shouldCreateRecurringSuccessor({
          finalizingOccurrence: complete,
          recurring: point.recurring,
          resolved: point.resolved,
          successorExists,
        })
      ) {
        await tx.talkingPoint.create({
          data: {
            content: point.content,
            recurring: true,
            teamMemberId: checkIn.teamMemberId,
            renewedFromId: savedPointId,
          },
        });
      }
    }

    return tx.checkIn.findUnique({
      where: { id: checkIn.id },
      include: { actionItems: true, talkingPoints: true },
    });
  });
}

// GET /api/check-ins?teamMemberId=xxx
router.get("/", asyncHandler(async (req, res) => {
  const teamMemberId = req.query.teamMemberId as string | undefined;
  const checkIns = await prisma.checkIn.findMany({
    where: {
      deletedAt: null,
      teamMember: { deletedAt: null },
      ...(teamMemberId ? { teamMemberId } : {}),
    },
    orderBy: { scheduledDate: "desc" },
    include: { actionItems: true, teamMember: true },
  });
  res.json(checkIns);
}));

// GET /api/check-ins/wins
// A deliberately small projection for the private dashboard wall. Only
// completed, non-deleted check-ins contribute, and no other check-in notes
// are exposed by this endpoint.
router.get("/wins", asyncHandler(async (_req, res) => {
  const checkIns = await prisma.checkIn.findMany({
    where: {
      status: "COMPLETED",
      deletedAt: null,
      wins: { not: null },
      teamMember: { deletedAt: null },
    },
    orderBy: [{ completedAt: "desc" }, { scheduledDate: "desc" }],
    take: 24,
    select: {
      id: true,
      wins: true,
      completedAt: true,
      scheduledDate: true,
      teamMember: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          avatarSeed: true,
        },
      },
    },
  });

  const wins = checkIns
    .filter((checkIn) => checkIn.wins?.trim())
    .slice(0, 12)
    .map((checkIn) => ({
      id: checkIn.id,
      text: checkIn.wins!.trim(),
      date: checkIn.completedAt ?? checkIn.scheduledDate,
      teamMember: checkIn.teamMember,
    }));

  res.json(wins);
}));

// GET /api/check-ins/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: req.params.id },
    include: { actionItems: true, talkingPoints: true, teamMember: true },
  });
  if (!checkIn || checkIn.deletedAt) return res.status(404).json({ error: "Check-in not found" });
  res.json(checkIn);
}));

// POST /api/check-ins  — start a check-in, or resume the team member's
// existing in-progress one rather than creating a duplicate. A person can
// only have one non-completed check-in open at a time.
router.post("/", asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.checkIn.findFirst({
    where: { teamMemberId: parsed.data.teamMemberId, status: "SCHEDULED", deletedAt: null },
    orderBy: { scheduledDate: "desc" },
  });
  if (existing) return res.status(200).json(existing);

  try {
    const checkIn = await prisma.checkIn.create({
      data: {
        teamMemberId: parsed.data.teamMemberId,
        scheduledDate: new Date(parsed.data.scheduledDate),
        status: "SCHEDULED",
      },
    });
    return res.status(201).json(checkIn);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.checkIn.findFirst({
        where: { teamMemberId: parsed.data.teamMemberId, status: "SCHEDULED", deletedAt: null },
        orderBy: { scheduledDate: "desc" },
      });
      if (winner) return res.status(200).json(winner);
    }
    throw err;
  }
}));

// POST /api/check-ins/:id/save
// Persists notes/action-items/talking-points as a draft — the check-in stays
// SCHEDULED so the user can come back and keep editing before completing it.
router.post("/:id/save", asyncHandler(async (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const checkIn = await prisma.checkIn.findUnique({ where: { id: req.params.id } });
  if (!checkIn || checkIn.deletedAt) return res.status(404).json({ error: "Check-in not found" });
  if (checkIn.status === "COMPLETED") {
    return res.status(400).json({ error: "This check-in is already completed" });
  }

  const result = await applyCheckInUpdate(checkIn, parsed.data, { complete: false });
  res.json(result);
}));

// POST /api/check-ins/:id/complete
// Records notes and this check-in's action items (new + carried-over/updated),
// then marks the check-in COMPLETED.
router.post("/:id/complete", asyncHandler(async (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const checkIn = await prisma.checkIn.findUnique({ where: { id: req.params.id } });
  if (!checkIn || checkIn.deletedAt) return res.status(404).json({ error: "Check-in not found" });
  if (checkIn.status === "COMPLETED") {
    return res.status(409).json({ error: "This check-in is already completed" });
  }

  const result = await applyCheckInUpdate(checkIn, parsed.data, { complete: true });
  res.json(result);
}));

// POST /api/check-ins/:id/send-summary
// Emails the given subject/body to this check-in's team member. The
// recipient is always derived server-side from the team member relation —
// never trust a client-supplied "to" — so this can't become an open relay.
router.post("/:id/send-summary", asyncHandler(async (req, res) => {
  const parsed = sendSummarySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: req.params.id },
    include: { teamMember: true },
  });
  if (!checkIn || checkIn.deletedAt) return res.status(404).json({ error: "Check-in not found" });

  const recipient = checkIn.teamMember?.email;
  if (!recipient) {
    return res.status(400).json({ error: "This team member has no email on file" });
  }

  try {
    await sendCheckInSummaryEmail({ to: recipient, subject: parsed.data.subject, text: parsed.data.body });
  } catch (err) {
    if (err instanceof MailerNotConfiguredError) {
      console.error("Email send skipped: SendGrid is not configured");
      return res.status(503).json({ error: "Email sending is not configured" });
    }
    console.error("Failed to send check-in summary email", err);
    return res.status(502).json({ error: "Failed to send the email. Please try again." });
  }

  res.status(204).send();
}));

// DELETE /api/check-ins/:id  — soft delete.
router.delete("/:id", asyncHandler(async (req, res) => {
  const deletedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.checkIn.update({
      where: { id: req.params.id, deletedAt: null },
      data: { deletedAt },
    });
    await tx.actionItem.updateMany({
      where: { checkInId: req.params.id, deletedAt: null },
      data: { deletedAt },
    });
    await tx.talkingPoint.updateMany({
      where: { checkInId: req.params.id, deletedAt: null },
      data: { deletedAt },
    });
  });
  res.status(204).send();
}));

export default router;
