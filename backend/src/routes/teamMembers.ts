import { Router } from "express";
import { unlink } from "fs/promises";
import path from "path";
import { z } from "zod";
import { prisma } from "../db";
import { nextDueDate } from "../utils/cadence";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import { avatarUpload, avatarUploadDir } from "../middleware/avatarUpload";

const router = Router();

const cadenceEnum = z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]);

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  cadence: cadenceEnum.default("FORTNIGHTLY"),
  startDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  active: z.boolean().optional(),
  avatarSeed: z.string().max(120).nullable().optional(),
});

// GET /api/team-members  — list all, each with computed "next due" date.
// Includes soft-deleted members (the Team page shows them with a "Deleted"
// status for an audit trail) — consumers that only want active people
// (Dashboard, Review) filter deletedAt/active out themselves.
router.get("/", asyncHandler(async (_req, res) => {
  const [members, activeCheckIns] = await Promise.all([
    prisma.teamMember.findMany({
      orderBy: { name: "asc" },
      include: {
        checkIns: {
          where: { status: "COMPLETED", deletedAt: null },
          orderBy: { scheduledDate: "desc" },
          take: 1,
        },
        _count: {
          select: {
            actionItems: { where: { deletedAt: null } },
          },
        },
      },
    }),
    // A person can only have one in-progress (SCHEDULED) check-in at a time,
    // so the UI can offer "Resume" instead of starting a duplicate.
    prisma.checkIn.findMany({
      where: { status: "SCHEDULED", deletedAt: null },
      select: { id: true, teamMemberId: true },
    }),
  ]);

  const activeByMember = new Map(
    activeCheckIns.map((c: { id: string; teamMemberId: string }) => [c.teamMemberId, c.id])
  );

  const withNextDue = members.map((m: (typeof members)[number]) => {
    const lastCompleted = m.checkIns[0];
    const anchor = lastCompleted ? lastCompleted.scheduledDate : m.startDate;
    const nextDue = nextDueDate(anchor, m.cadence);
    const { checkIns: _checkIns, ...rest } = m;
    return {
      ...rest,
      nextDueDate: nextDue,
      lastCompletedAt: lastCompleted?.completedAt ?? null,
      activeCheckInId: activeByMember.get(m.id) ?? null,
    };
  });

  res.json(withNextDue);
}));

// GET /api/team-members/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const member = await prisma.teamMember.findUnique({
    where: { id: req.params.id },
    include: {
      checkIns: {
        where: { deletedAt: null },
        orderBy: { scheduledDate: "desc" },
        include: {
          actionItems: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
          talkingPoints: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        },
      },
      actionItems: {
        where: {
          carriedOverTo: { is: null },
          deletedAt: null,
          OR: [{ checkInId: null }, { checkIn: { deletedAt: null } }],
        },
        orderBy: { createdAt: "desc" },
      },
      talkingPoints: {
        where: {
          deletedAt: null,
          OR: [{ checkInId: null }, { checkIn: { deletedAt: null } }],
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!member || member.deletedAt) return res.status(404).json({ error: "Team member not found" });

  const lastCompleted = member.checkIns.find(
    (c: (typeof member.checkIns)[number]) => c.status === "COMPLETED"
  );
  const activeCheckIn = member.checkIns.find(
    (c: (typeof member.checkIns)[number]) => c.status === "SCHEDULED"
  );
  const anchor = lastCompleted ? lastCompleted.scheduledDate : member.startDate;
  const nextDue = nextDueDate(anchor, member.cadence);

  res.json({ ...member, nextDueDate: nextDue, activeCheckInId: activeCheckIn?.id ?? null });
}));

// POST /api/team-members
router.post("/", asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, startDate, ...rest } = parsed.data;
  const member = await prisma.teamMember.create({
    data: {
      ...rest,
      email: email || null,
      startDate: startDate ? new Date(startDate) : new Date(),
    },
  });
  res.status(201).json(member);
}));

// PATCH /api/team-members/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { startDate, email, ...rest } = parsed.data;
  const member = await prisma.teamMember.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(email !== undefined ? { email: email || null } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
    },
  });
  res.json(member);
}));

async function removeAvatarFile(avatarUrl: string | null) {
  if (!avatarUrl?.startsWith("/uploads/")) return;
  const filename = path.basename(avatarUrl);
  await unlink(path.join(avatarUploadDir, filename)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

// POST /api/team-members/:id/avatar
router.post(
  "/:id/avatar",
  avatarUpload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });

    const existing = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
      select: { avatarUrl: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) {
      await removeAvatarFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ error: "Team member not found" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const member = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { avatarUrl },
    });
    await removeAvatarFile(existing.avatarUrl);
    res.json(member);
  })
);

// DELETE /api/team-members/:id/avatar
router.delete("/:id/avatar", asyncHandler(async (req, res) => {
  const existing = await prisma.teamMember.findUnique({
    where: { id: req.params.id },
    select: { avatarUrl: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    return res.status(404).json({ error: "Team member not found" });
  }

  const member = await prisma.teamMember.update({
    where: { id: req.params.id },
    data: { avatarUrl: null },
  });
  await removeAvatarFile(existing.avatarUrl);
  res.json(member);
}));

// DELETE /api/team-members/:id  — soft delete: hides the member from active
// views (and, via deletedAt filters elsewhere, their check-ins/action
// items/talking points) without erasing any history from the database.
// Records who deleted it for the audit trail shown in the Team table.
router.delete("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const member = await prisma.teamMember.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), deletedBy: req.user?.email ?? null },
  });
  res.json(member);
}));

export default router;
