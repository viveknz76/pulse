const DAY_MS = 24 * 60 * 60 * 1000;
export const APPLICATION_TIME_ZONE = import.meta.env.VITE_APP_TIME_ZONE || "Pacific/Auckland";

export function dateOnlyValue(value: string): string {
  return value.slice(0, 10);
}

export function todayDateOnly(reference: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Parse a date-only value at local midnight without UTC shifting the day. */
export function parseDateOnlyLocal(value: string): Date {
  const [year, month, day] = dateOnlyValue(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateOnly(
  value: string,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  return parseDateOnlyLocal(value).toLocaleDateString(locale, options);
}

export function calendarDayDifference(value: string, reference: Date = new Date()): number {
  const [year, month, day] = dateOnlyValue(value).split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayDateOnly(reference).split("-").map(Number);
  return Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) /
      DAY_MS
  );
}
