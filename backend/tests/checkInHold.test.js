const assert = require("node:assert/strict");
const test = require("node:test");
const {
  effectiveNextDueDate,
  isCheckInScheduleOnHold,
} = require("../dist/utils/checkInHold");

const future = new Date("2026-08-10T00:00:00.000Z");
const now = new Date("2026-07-30T00:00:00.000Z");

test("a paused schedule remains on hold until its return date", () => {
  assert.equal(
    isCheckInScheduleOnHold(
      { checkInsPausedAt: now, checkInsResumeOn: future },
      new Date("2026-08-09T11:59:59.000Z")
    ),
    true
  );
  assert.equal(
    isCheckInScheduleOnHold(
      { checkInsPausedAt: now, checkInsResumeOn: future },
      new Date("2026-08-09T12:00:00.000Z")
    ),
    false
  );
});

test("an indefinite hold remains paused", () => {
  assert.equal(
    isCheckInScheduleOnHold(
      { checkInsPausedAt: now, checkInsResumeOn: null },
      future
    ),
    true
  );
});

test("return date becomes the next due date after leave", () => {
  const due = effectiveNextDueDate(
    {
      checkInsPausedAt: now,
      checkInsResumeOn: future,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      cadence: "FORTNIGHTLY",
    },
    {
      scheduledDate: new Date("2026-07-15T00:00:00.000Z"),
      completedAt: new Date("2026-07-15T01:00:00.000Z"),
    }
  );
  assert.equal(due.toISOString(), future.toISOString());
});

test("cadence resumes from the first completed check-in after leave", () => {
  const completedAt = new Date("2026-08-10T03:00:00.000Z");
  const due = effectiveNextDueDate(
    {
      checkInsPausedAt: now,
      checkInsResumeOn: future,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      cadence: "WEEKLY",
    },
    {
      scheduledDate: new Date("2026-07-20T00:00:00.000Z"),
      completedAt,
    }
  );
  assert.equal(due.toISOString(), "2026-08-17T00:00:00.000Z");
});

test("normal cadence follows the editable check-in date", () => {
  const due = effectiveNextDueDate(
    {
      checkInsPausedAt: null,
      checkInsResumeOn: null,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      cadence: "FORTNIGHTLY",
    },
    {
      scheduledDate: new Date("2026-07-22T00:00:00.000Z"),
      completedAt: new Date("2026-07-30T03:00:00.000Z"),
    }
  );
  assert.equal(due.toISOString(), "2026-08-05T00:00:00.000Z");
});

test("an active check-in uses its scheduled date instead of the cadence date", () => {
  const due = effectiveNextDueDate(
    {
      checkInsPausedAt: null,
      checkInsResumeOn: null,
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      cadence: "WEEKLY",
    },
    {
      scheduledDate: new Date("2026-07-27T00:00:00.000Z"),
      completedAt: new Date("2026-07-28T01:00:00.000Z"),
    },
    { scheduledDate: new Date("2026-08-04T00:00:00.000Z") }
  );

  assert.equal(due.toISOString(), "2026-08-04T00:00:00.000Z");
});
