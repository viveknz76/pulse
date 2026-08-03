const assert = require("node:assert/strict");
const test = require("node:test");
const {
  currentWeekRanges,
  dateOnlyInTimeZone,
  parseDateOnly,
  startOfZonedDate,
} = require("../dist/utils/dateOnly");

test("resolves the Auckland calendar date from a UTC instant", () => {
  assert.equal(
    dateOnlyInTimeZone(new Date("2026-08-03T19:30:00.000Z")),
    "2026-08-04"
  );
});

test("converts Auckland midnight to the correct UTC instant across daylight saving", () => {
  assert.equal(startOfZonedDate("2026-08-04").toISOString(), "2026-08-03T12:00:00.000Z");
  assert.equal(startOfZonedDate("2026-01-15").toISOString(), "2026-01-14T11:00:00.000Z");
});

test("builds Monday-to-Sunday date and instant ranges in Auckland", () => {
  const range = currentWeekRanges(new Date("2026-08-04T01:00:00.000Z"));
  assert.equal(range.startDate.toISOString(), "2026-08-03T00:00:00.000Z");
  assert.equal(range.endDate.toISOString(), "2026-08-09T00:00:00.000Z");
  assert.equal(range.startInstant.toISOString(), "2026-08-02T12:00:00.000Z");
  assert.equal(range.endInstantExclusive.toISOString(), "2026-08-09T12:00:00.000Z");
});

test("rejects impossible date-only values", () => {
  assert.throws(() => parseDateOnly("2026-02-30"), /Invalid date-only value/);
});
