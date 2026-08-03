export const APPLICATION_TIME_ZONE = process.env.APP_TIME_ZONE || "Pacific/Auckland";
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function datePartsInTimeZone(date: Date, timeZone = APPLICATION_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function dateOnlyInTimeZone(
  date: Date = new Date(),
  timeZone = APPLICATION_TIME_ZONE
): string {
  const parts = datePartsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Prisma represents PostgreSQL DATE values as midnight UTC JavaScript Dates. */
export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_PATTERN.test(value)) throw new Error(`Invalid date-only value: ${value}`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return date;
}

export function dateOnlyFromPrisma(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = datePartsInTimeZone(date, timeZone);
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return localAsUtc - date.getTime();
}

/** Convert midnight on a date in an IANA timezone into its UTC instant. */
export function startOfZonedDate(dateValue: string, timeZone = APPLICATION_TIME_ZONE): Date {
  const localMidnightAsUtc = Date.parse(`${dateValue}T00:00:00.000Z`);
  let instant = localMidnightAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    instant = localMidnightAsUtc - timeZoneOffsetMilliseconds(new Date(instant), timeZone);
  }
  return new Date(instant);
}

export function currentWeekRanges(reference: Date = new Date()) {
  const today = parseDateOnly(dateOnlyInTimeZone(reference));
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;

  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - daysSinceMonday);

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);

  const afterEndDate = new Date(endDate);
  afterEndDate.setUTCDate(afterEndDate.getUTCDate() + 1);

  return {
    startDate,
    endDate,
    startInstant: startOfZonedDate(dateOnlyFromPrisma(startDate)),
    endInstantExclusive: startOfZonedDate(dateOnlyFromPrisma(afterEndDate)),
  };
}
