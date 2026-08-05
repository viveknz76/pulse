const assert = require("node:assert/strict");
const test = require("node:test");
const {
  dueDateAfterManagerLeave,
  isDateWithinManagerLeave,
} = require("../dist/utils/managerLeave");

const leave = [
  {
    startsOn: new Date("2026-08-10T00:00:00.000Z"),
    endsOn: new Date("2026-08-23T00:00:00.000Z"),
  },
];

test("recognizes dates inside an inclusive manager leave period", () => {
  assert.equal(isDateWithinManagerLeave(new Date("2026-08-10T00:00:00.000Z"), leave), true);
  assert.equal(isDateWithinManagerLeave(new Date("2026-08-23T00:00:00.000Z"), leave), true);
  assert.equal(isDateWithinManagerLeave(new Date("2026-08-24T00:00:00.000Z"), leave), false);
});

test("skips weekly occurrences during manager leave and preserves cadence", () => {
  const due = dueDateAfterManagerLeave(
    new Date("2026-08-11T00:00:00.000Z"),
    "WEEKLY",
    leave
  );
  assert.equal(due.toISOString(), "2026-08-25T00:00:00.000Z");
});

test("leaves unaffected due dates unchanged", () => {
  const due = new Date("2026-08-25T00:00:00.000Z");
  assert.equal(dueDateAfterManagerLeave(due, "FORTNIGHTLY", leave), due);
});
