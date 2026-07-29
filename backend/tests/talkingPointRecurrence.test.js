const assert = require("node:assert/strict");
const test = require("node:test");
const {
  shouldCreateRecurringSuccessor,
} = require("../dist/utils/talkingPointRecurrence");

test("renews a recurring talking point when its occurrence is finalized as discussed", () => {
  assert.equal(
    shouldCreateRecurringSuccessor({
      finalizingOccurrence: true,
      recurring: true,
      resolved: true,
      successorExists: false,
    }),
    true
  );
});

test("does not renew drafts, unfinished points, one-off points, or existing successors", () => {
  const cases = [
    { finalizingOccurrence: false, recurring: true, resolved: true, successorExists: false },
    { finalizingOccurrence: true, recurring: true, resolved: false, successorExists: false },
    { finalizingOccurrence: true, recurring: false, resolved: true, successorExists: false },
    { finalizingOccurrence: true, recurring: true, resolved: true, successorExists: true },
  ];

  for (const decision of cases) {
    assert.equal(shouldCreateRecurringSuccessor(decision), false);
  }
});
