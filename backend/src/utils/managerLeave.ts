import { Cadence, nextDueDate } from "./cadence";
import { dateOnlyFromPrisma } from "./dateOnly";

export type ManagerLeaveRange = {
  startsOn: Date;
  endsOn: Date;
};

export function isDateWithinManagerLeave(
  date: Date,
  leavePeriods: ManagerLeaveRange[]
): boolean {
  const dateValue = dateOnlyFromPrisma(date);
  return leavePeriods.some(
    (period) =>
      dateValue >= dateOnlyFromPrisma(period.startsOn) &&
      dateValue <= dateOnlyFromPrisma(period.endsOn)
  );
}

/**
 * Skip cadence occurrences that fall while the manager is away. This keeps
 * the team member's normal rhythm rather than moving every check-in to the
 * manager's first day back.
 */
export function dueDateAfterManagerLeave(
  dueDate: Date,
  cadence: Cadence,
  leavePeriods: ManagerLeaveRange[]
): Date {
  let adjusted = dueDate;

  // The guard prevents malformed or unexpectedly broad data from creating an
  // infinite loop while still supporting several years of recurring leave.
  for (let occurrence = 0; occurrence < 240; occurrence += 1) {
    if (!isDateWithinManagerLeave(adjusted, leavePeriods)) return adjusted;
    adjusted = nextDueDate(adjusted, cadence);
  }

  throw new Error("Unable to calculate the next check-in after manager leave");
}
