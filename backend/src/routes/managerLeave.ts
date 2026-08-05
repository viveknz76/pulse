import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import { addDays } from "../utils/cadence";
import { effectiveNextDueDate } from "../utils/checkInHold";
import {
  DATE_ONLY_PATTERN,
  dateOnlyFromPrisma,
  dateOnlyInTimeZone,
  parseDateOnly,
  startOfZonedDate,
} from "../utils/dateOnly";

const router = Router();

const leaveSchema = z.object({
  startsOn: z.string().regex(DATE_ONLY_PATTERN),
  endsOn: z.string().regex(DATE_ONLY_PATTERN),
}).superRefine((value, context) => {
  if (value.endsOn < value.startsOn) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsOn"],
      message: "End date must be on or after the start date",
    });
  }

  const startsOn = parseDateOnly(value.startsOn);
  const endsOn = parseDateOnly(value.endsOn);
  const durationDays = Math.round((endsOn.getTime() - startsOn.getTime()) / 86_400_000);
  if (durationDays > 366) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsOn"],
      message: "Leave period cannot be longer than one year",
    });
  }
});

function authenticatedEmail(req: AuthedRequest): string {
  if (!req.user?.email) throw new Error("Authenticated user email is missing");
  return req.user.email.toLowerCase();
}

async function buildPreview(userEmail: string, startsOn: Date, endsOn: Date) {
  const [members, activeCheckIns, existingLeavePeriods, calendarEvents] = await Promise.all([
    prisma.teamMember.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        team: { select: { id: true, name: true } },
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
      select: { id: true, teamMemberId: true, scheduledDate: true },
    }),
    prisma.managerLeavePeriod.findMany({
      where: { userEmail },
      select: { startsOn: true, endsOn: true },
    }),
    prisma.checkInCalendarEvent.findMany({
      where: {
        userEmail,
        startsAt: {
          gte: startOfZonedDate(dateOnlyFromPrisma(startsOn)),
          lt: startOfZonedDate(dateOnlyFromPrisma(addDays(endsOn, 1))),
        },
      },
      orderBy: { startsAt: "asc" },
      include: {
        teamMember: {
          select: { id: true, name: true, avatarUrl: true, avatarSeed: true },
        },
      },
    }),
  ]);

  const activeByMember = new Map(
    activeCheckIns.map((checkIn: (typeof activeCheckIns)[number]) => [
      checkIn.teamMemberId,
      checkIn,
    ])
  );
  const proposedPeriod = { startsOn, endsOn };
  const startValue = dateOnlyFromPrisma(startsOn);
  const endValue = dateOnlyFromPrisma(endsOn);

  const affectedCheckIns = members.flatMap((member: (typeof members)[number]) => {
    const lastCompleted = member.checkIns[0];
    const activeCheckIn = activeByMember.get(member.id);
    const currentDueDate = effectiveNextDueDate(
      member,
      lastCompleted,
      activeCheckIn,
      existingLeavePeriods
    );
    const currentDueValue = dateOnlyFromPrisma(currentDueDate);
    if (currentDueValue < startValue || currentDueValue > endValue) return [];

    const adjustedDueDate = effectiveNextDueDate(
      member,
      lastCompleted,
      activeCheckIn,
      [...existingLeavePeriods, proposedPeriod]
    );
    const { checkIns: _checkIns, ...teamMember } = member;
    return [{
      teamMember,
      currentDueDate,
      adjustedDueDate,
      activeCheckInId: activeCheckIn?.id ?? null,
    }];
  });

  return { affectedCheckIns, calendarEvents };
}

// GET /api/manager-leave — current and upcoming leave periods.
router.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const periods = await prisma.managerLeavePeriod.findMany({
    where: {
      userEmail: authenticatedEmail(req),
      endsOn: { gte: parseDateOnly(dateOnlyInTimeZone()) },
    },
    orderBy: { startsOn: "asc" },
  });
  res.json(periods);
}));

// GET /api/manager-leave/preview — show the check-ins a leave period would skip.
router.get("/preview", asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = leaveSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const preview = await buildPreview(
    authenticatedEmail(req),
    parseDateOnly(parsed.data.startsOn),
    parseDateOnly(parsed.data.endsOn)
  );
  res.json(preview);
}));

// POST /api/manager-leave — plan a leave period and skip due occurrences within it.
router.post("/", asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = leaveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.endsOn < dateOnlyInTimeZone()) {
    return res.status(400).json({ error: "Leave must end today or in the future" });
  }

  const userEmail = authenticatedEmail(req);
  const startsOn = parseDateOnly(parsed.data.startsOn);
  const endsOn = parseDateOnly(parsed.data.endsOn);
  const overlap = await prisma.managerLeavePeriod.findFirst({
    where: {
      userEmail,
      startsOn: { lte: endsOn },
      endsOn: { gte: startsOn },
    },
    select: { id: true },
  });
  if (overlap) {
    return res.status(409).json({ error: "This leave overlaps an existing period" });
  }

  const period = await prisma.managerLeavePeriod.create({
    data: { userEmail, startsOn, endsOn },
  });
  res.status(201).json(period);
}));

// DELETE /api/manager-leave/:id — remove a planned leave period.
router.delete("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const period = await prisma.managerLeavePeriod.findFirst({
    where: { id: req.params.id, userEmail: authenticatedEmail(req) },
    select: { id: true },
  });
  if (!period) return res.status(404).json({ error: "Leave period not found" });

  await prisma.managerLeavePeriod.delete({ where: { id: period.id } });
  res.status(204).send();
}));

export default router;
