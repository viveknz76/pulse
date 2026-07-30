const assert = require("node:assert/strict");
const test = require("node:test");
const { rankCalendarCandidates } = require("../dist/utils/calendarEventMatcher");

const around = new Date("2026-08-10T22:00:00.000Z");

test("calendar candidates prioritize an attendee email match", () => {
  const ranked = rankCalendarCandidates(
    [
      {
        id: "title-match",
        summary: "Check-in with Jordan Lee",
        startsAt: "2026-08-10T22:00:00.000Z",
        endsAt: "2026-08-10T22:30:00.000Z",
        attendeeEmails: [],
      },
      {
        id: "email-match",
        summary: "Weekly catch-up",
        startsAt: "2026-08-12T22:00:00.000Z",
        endsAt: "2026-08-12T22:30:00.000Z",
        attendeeEmails: ["jordan@ricado.co.nz"],
      },
    ],
    { name: "Jordan Lee", email: "jordan@ricado.co.nz" },
    around
  );

  assert.equal(ranked[0].id, "email-match");
  assert.deepEqual(ranked[0].matchReasons, ["Employee email is invited", "Near the next due date"]);
});

test("calendar candidates use title and date proximity as secondary signals", () => {
  const ranked = rankCalendarCandidates(
    [
      {
        id: "unrelated",
        summary: "Planning",
        startsAt: "2026-08-11T22:00:00.000Z",
        endsAt: "2026-08-11T23:00:00.000Z",
        attendeeEmails: [],
      },
      {
        id: "named",
        summary: "Jordan Lee 1:1",
        startsAt: "2026-08-20T22:00:00.000Z",
        endsAt: "2026-08-20T22:30:00.000Z",
        attendeeEmails: [],
      },
    ],
    { name: "Jordan Lee" },
    around
  );

  assert.equal(ranked[0].id, "named");
  assert.ok(ranked[0].matchScore > ranked[1].matchScore);
});
