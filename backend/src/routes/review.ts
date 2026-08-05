import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { currentWeekRanges } from "../utils/dateOnly";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import {
  effectiveNextDueDate,
  isCheckInScheduleOnHold,
} from "../utils/checkInHold";

const router = Router();

// GET /api/review — weekly review of action items: overdue, due this week, upcoming.
router.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const { startDate, endDate, startInstant, endInstantExclusive } = currentWeekRanges();

  const notDeleted: Prisma.ActionItemWhereInput = {
    deletedAt: null,
    teamMember: { deletedAt: null },
    OR: [{ checkInId: null }, { checkIn: { deletedAt: null } }],
  };

  const [overdue, dueThisWeek, upcoming, noDueDate, recentlyCompleted] = await Promise.all([
    prisma.actionItem.findMany({
      where: {
        ...notDeleted,
        status: { not: "DONE" },
        dueDate: { lt: startDate },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        ...notDeleted,
        status: { not: "DONE" },
        dueDate: { gte: startDate, lte: endDate },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        ...notDeleted,
        status: { not: "DONE" },
        dueDate: { gt: endDate },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        ...notDeleted,
        status: { not: "DONE" },
        dueDate: null,
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.actionItem.findMany({
      where: {
        ...notDeleted,
        status: "DONE",
        completedAt: { gte: startInstant, lt: endInstantExclusive },
        carriedOverTo: { is: null },
      },
      include: { teamMember: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // Team members whose next check-in is due this week.
  const [members, activeCheckIns, managerLeavePeriods] = await Promise.all([
    prisma.teamMember.findMany({
      where: { active: true, deletedAt: null },
      include: {
        checkIns: {
          where: { status: "COMPLETED", deletedAt: null },
          orderBy: { scheduledDate: "desc" },
          take: 1,
        },
      },
    }),
    prisma.checkIn.findMany({
      where: {
        status: "SCHEDULED",
        deletedAt: null,
        teamMember: { active: true, deletedAt: null },
      },
      select: { teamMemberId: true, scheduledDate: true },
    }),
    prisma.managerLeavePeriod.findMany({
      where: { userEmail: req.user!.email.toLowerCase() },
      select: { startsOn: true, endsOn: true },
    }),
  ]);

  const activeByMember = new Map(
    activeCheckIns.map((checkIn: (typeof activeCheckIns)[number]) => [
      checkIn.teamMemberId,
      checkIn,
    ])
  );

  const checkInsDueThisWeek = members
    .filter((m: (typeof members)[number]) => !isCheckInScheduleOnHold(m))
    .map((m: (typeof members)[number]) => {
      const lastCompleted = m.checkIns[0];
      const due = effectiveNextDueDate(
        m,
        lastCompleted,
        activeByMember.get(m.id),
        managerLeavePeriods
      );
      return { teamMember: m, nextDueDate: due };
    })
    .filter((x: { nextDueDate: Date }) => x.nextDueDate >= startDate && x.nextDueDate <= endDate);

  res.json({
    weekStart: startDate,
    weekEnd: endDate,
    overdue,
    dueThisWeek,
    upcoming,
    noDueDate,
    recentlyCompleted,
    checkInsDueThisWeek,
  });
}));

export default router;
