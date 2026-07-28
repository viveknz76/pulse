import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

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
});

const createSchema = z.object({
  teamMemberId: z.string().min(1),
  scheduledDate: z.string().datetime(),
});

const draftSchema = z.object({
  wins: z.string().optional(),
  challenges: z.string().optional(),
  growthNotes: z.string().optional(),
  actionItems: z.array(actionItemInput).default([]),
  talkingPoints: z.array(talkingPointInput).default([]),
});

// Shared by /save (draft, stays SCHEDULED) and /complete (marks COMPLETED).
// Persists notes plus any action-item/talking-point edits made in the form.
async function applyCheckInUpdate(
  checkIn: { id: string; teamMemberId: string },
  data: z.infer<typeof draftSchema>,
  { complete }: { complete: boolean }
) {
  const { wins, challenges, growthNotes, actionItems, talkingPoints } = data;

  return prisma.$transaction(async (tx: any) => {
    await tx.checkIn.update({
      where: { id: checkIn.id },
      data: {
        wins,
        challenges,
        growthNotes,
        ...(complete ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });

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
      if (point.id) {
        const existing = await tx.talkingPoint.findUnique({ where: { id: point.id } });
        if (!existing || existing.teamMemberId !== checkIn.teamMemberId || existing.deletedAt) {
          throw new Error(`Talking point ${point.id} does not belong to this team member`);
        }

        await tx.talkingPoint.update({
          where: { id: existing.id },
          data: {
            content: point.content,
            resolved: point.resolved,
            resolvedAt: point.resolved ? new Date() : null,
            // Attach previously unassigned points to their first check-in, but
            // never move a point away from an earlier historical check-in.
            ...(existing.checkInId === null ? { checkInId: checkIn.id } : {}),
          },
        });
      } else {
        await tx.talkingPoint.create({
          data: {
            content: point.content,
            resolved: point.resolved,
            resolvedAt: point.resolved ? new Date() : null,
            teamMemberId: checkIn.teamMemberId,
            checkInId: checkIn.id,
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

  const checkIn = await prisma.checkIn.create({
    data: {
      teamMemberId: parsed.data.teamMemberId,
      scheduledDate: new Date(parsed.data.scheduledDate),
      status: "SCHEDULED",
    },
  });
  res.status(201).json(checkIn);
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

  const result = await applyCheckInUpdate(checkIn, parsed.data, { complete: true });
  res.json(result);
}));

// DELETE /api/check-ins/:id  — soft delete.
router.delete("/:id", asyncHandler(async (req, res) => {
  try {
    await prisma.checkIn.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Check-in not found" });
  }
}));

export default router;
