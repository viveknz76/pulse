// Local union type mirroring the Prisma `Cadence` enum. Kept independent of
// the generated Prisma client so this util has no generation-order dependency.
export type Cadence = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

/** Number of days to add for fixed-length cadences. */
export function cadenceDays(cadence: Exclude<Cadence, "MONTHLY">): number {
  switch (cadence) {
    case "WEEKLY":
      return 7;
    case "FORTNIGHTLY":
      return 14;
  }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Add calendar months, clamping dates such as 31 January to February's end. */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

/**
 * Given the date of the last completed (or scheduled) check-in and a cadence,
 * compute the next check-in due date.
 */
export function nextDueDate(fromDate: Date, cadence: Cadence): Date {
  if (cadence === "MONTHLY") {
    return addCalendarMonths(fromDate, 1);
  }
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
