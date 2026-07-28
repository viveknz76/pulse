const assert = require("node:assert/strict");
const test = require("node:test");
const { nextDueDate } = require("../dist/utils/cadence");

test("monthly cadence advances by one calendar month", () => {
  assert.equal(
    nextDueDate(new Date("2026-01-15T09:30:00.000Z"), "MONTHLY").toISOString(),
    "2026-02-15T09:30:00.000Z"
  );
});

test("monthly cadence clamps to the target month's final day", () => {
  const cases = [
    ["2026-01-31T00:00:00.000Z", "2026-02-28T00:00:00.000Z"],
    ["2028-01-31T00:00:00.000Z", "2028-02-29T00:00:00.000Z"],
    ["2026-03-31T00:00:00.000Z", "2026-04-30T00:00:00.000Z"],
  ];

  for (const [from, expected] of cases) {
    assert.equal(nextDueDate(new Date(from), "MONTHLY").toISOString(), expected);
  }
});

test("weekly and fortnightly cadences remain fixed-length", () => {
  const from = new Date("2026-01-31T00:00:00.000Z");
  assert.equal(nextDueDate(from, "WEEKLY").toISOString(), "2026-02-07T00:00:00.000Z");
  assert.equal(nextDueDate(from, "FORTNIGHTLY").toISOString(), "2026-02-14T00:00:00.000Z");
});
