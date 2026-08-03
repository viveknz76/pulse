import { Cadence, nextDueDate } from "./cadence";
import {
  dateOnlyFromPrisma,
  dateOnlyInTimeZone,
  parseDateOnly,
} from "./dateOnly";

type HoldFields = {
  checkInsPausedAt: Date | null;
  checkInsResumeOn: Date | null;
};

type CompletedCheckIn = {
  scheduledDate: Date;
  completedAt: Date | null;
};

type ActiveCheckIn = {
  scheduledDate: Date;
};

export function isCheckInScheduleOnHold(
  member: HoldFields,
  reference = new Date()
): boolean {
  if (!member.checkInsPausedAt) return false;
  return !member.checkInsResumeOn ||
    dateOnlyFromPrisma(member.checkInsResumeOn) > dateOnlyInTimeZone(reference);
}

export function effectiveNextDueDate(
  member: HoldFields & { startDate: Date; cadence: Cadence },
  lastCompleted?: CompletedCheckIn,
  activeCheckIn?: ActiveCheckIn
): Date {
  // An in-progress check-in represents the current conversation, so its
  // scheduled date takes precedence over the cadence-derived date.
  if (activeCheckIn) return activeCheckIn.scheduledDate;

  let anchor = lastCompleted?.scheduledDate ?? member.startDate;

  if (member.checkInsPausedAt && member.checkInsResumeOn) {
    const resumeDate = dateOnlyFromPrisma(member.checkInsResumeOn);
    const lastCompletionDate = lastCompleted?.completedAt
      ? dateOnlyInTimeZone(lastCompleted.completedAt)
      : lastCompleted
        ? dateOnlyFromPrisma(lastCompleted.scheduledDate)
        : null;
    if (!lastCompletionDate || lastCompletionDate < resumeDate) {
      return member.checkInsResumeOn;
    }

    // A draft started before leave may be completed after the employee
    // returns. In that one case, resume cadence from completion rather than
    // leaving the person immediately overdue against the old draft date.
    if (
      lastCompleted?.completedAt &&
      dateOnlyFromPrisma(lastCompleted.scheduledDate) < resumeDate
    ) {
      anchor = parseDateOnly(dateOnlyInTimeZone(lastCompleted.completedAt));
    }
  }

  return nextDueDate(anchor, member.cadence);
}
