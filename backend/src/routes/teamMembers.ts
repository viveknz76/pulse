import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { nextDueDate } from "../utils/cadence";
import { asyncHandler } from "../middleware/asyncHandler";

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
});

// GET /api/team-members  — list all, each with computed "next due" date
router.get("/", asyncHandler(async (_req, res) => {
  const [members, activeCheckIns] = await Promise.all([
    prisma.teamMember.findMany({
      orderBy: { name: "asc" },
      include: {
        checkIns: {
          where: { status: "COMPLETED" },
          orderBy: { scheduledDate: "desc" },
          take: 1,
        },
        _count: {
          select: {
            actionItems: true,
          },
        },
      },
    }),
    // A person can only have one in-progress (SCHEDULED) check-in at a time,
    // so the UI can offer "Resume" instead of starting a duplicate.
    prisma.checkIn.findMany({
      where: { status: "SCHEDULED" },
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
    const { checkIns, ...rest } = m;
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
        orderBy: { scheduledDate: "desc" },
        include: { actionItems: true },
      },
      actionItems: {
        where: { carriedOverTo: { is: null } },
        orderBy: { createdAt: "desc" },
      },
      talkingPoints: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!member) return res.status(404).json({ error: "Team member not found" });

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
  try {
    const member = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(email !== undefined ? { email: email || null } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
      },
    });
    res.json(member);
  } catch {
    res.status(404).json({ error: "Team member not found" });
  }
}));

// DELETE /api/team-members/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  try {
    await prisma.teamMember.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Team member not found" });
  }
}));

export default router;
