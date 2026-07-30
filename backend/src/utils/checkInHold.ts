import { Cadence, nextDueDate } from "./cadence";

type HoldFields = {
  checkInsPausedAt: Date | null;
  checkInsResumeOn: Date | null;
};

type CompletedCheckIn = {
  scheduledDate: Date;
  completedAt: Date | null;
};

export function isCheckInScheduleOnHold(
  member: HoldFields,
  reference = new Date()
): boolean {
  if (!member.checkInsPausedAt) return false;
  return !member.checkInsResumeOn || member.checkInsResumeOn.getTime() > reference.getTime();
}

export function effectiveNextDueDate(
  member: HoldFields & { startDate: Date; cadence: Cadence },
  lastCompleted?: CompletedCheckIn
): Date {
  let anchor = lastCompleted?.scheduledDate ?? member.startDate;

  if (member.checkInsPausedAt && member.checkInsResumeOn) {
    const lastCompletion = lastCompleted?.completedAt ?? lastCompleted?.scheduledDate;
    if (!lastCompletion || lastCompletion.getTime() < member.checkInsResumeOn.getTime()) {
      return member.checkInsResumeOn;
    }

    // A draft started before leave may be completed after the employee
    // returns. In that one case, resume cadence from completion rather than
    // leaving the person immediately overdue against the old draft date.
    if (
      lastCompleted?.completedAt &&
      lastCompleted.scheduledDate.getTime() < member.checkInsResumeOn.getTime()
    ) {
      anchor = lastCompleted.completedAt;
    }
  }

  return nextDueDate(anchor, member.cadence);
}
