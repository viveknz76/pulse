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
  if (member.checkInsPausedAt && member.checkInsResumeOn) {
    const lastCompletion = lastCompleted?.completedAt ?? lastCompleted?.scheduledDate;
    if (!lastCompletion || lastCompletion.getTime() < member.checkInsResumeOn.getTime()) {
      return member.checkInsResumeOn;
    }
  }

  const anchor = lastCompleted
    ? (lastCompleted.completedAt ?? lastCompleted.scheduledDate)
    : member.startDate;
  return nextDueDate(anchor, member.cadence);
}
