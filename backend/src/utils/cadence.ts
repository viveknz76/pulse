// Local union type mirroring the Prisma `Cadence` enum. Kept independent of
// the generated Prisma client so this util has no generation-order dependency.
export type Cadence = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

/** Number of days to add for each cadence to compute the next check-in date. */
export function cadenceDays(cadence: Cadence): number {
  switch (cadence) {
    case "WEEKLY":
      return 7;
    case "FORTNIGHTLY":
      return 14;
    case "MONTHLY":
      return 30;
    default:
      return 14;
  }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Given the date of the last completed (or scheduled) check-in and a cadence,
 * compute the next check-in due date.
 */
export function nextDueDate(fromDate: Date, cadence: Cadence): Date {
  return addDays(fromDate, cadenceDays(cadence));
}

/** Start (Mon 00:00) and end (Sun 23:59:59) of the current week, local time. */
export function currentWeekRange(reference: Date = new Date()): { start: Date; end: Date } {
  const day = reference.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7; // days since most recent Monday
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diffToMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);

  return { start, end };
}
