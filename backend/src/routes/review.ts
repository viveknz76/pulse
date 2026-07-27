import { Router } from "express";
import { prisma } from "../db";
import { currentWeekRange, nextDueDate } from "../utils/cadence";

const router = Router();

// GET /api/review — weekly review of action items: overdue, due this week, upcoming.
router.get("/", async (_req, res) => {
  const { start, end } = currentWeekRange();

  const [overdue, dueThisWeek, upcoming, noDueDate, recentlyCompleted] = await Promise.all([
    prisma.actionItem.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: start },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { gte: start, lte: end },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { gt: end },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: null,
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        status: "DONE",
        completedAt: { gte: start, lte: end },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // Team members whose next check-in is due this week.
  const members = await prisma.teamMember.findMany({
    where: { active: true },
    include: {
      checkIns: { where: { status: "COMPLETED" }, orderBy: { scheduledDate: "desc" }, take: 1 },
    },
  });

  const checkInsDueThisWeek = members
    .map((m: (typeof members)[number]) => {
      const lastCompleted = m.checkIns[0];
      const anchor = lastCompleted ? lastCompleted.scheduledDate : m.startDate;
      const due = nextDueDate(anchor, m.cadence);
      return { teamMember: m, nextDueDate: due };
    })
    .filter((x: { nextDueDate: Date }) => x.nextDueDate >= start && x.nextDueDate <= end);

  res.json({
    weekStart: start,
    weekEnd: end,
    overdue,
    dueThisWeek,
    upcoming,
    noDueDate,
    recentlyCompleted,
    checkInsDueThisWeek,
  });
});

export default router;
