const assert = require("node:assert/strict");
const test = require("node:test");
const {
  CLIFTON_STRENGTHS,
  cliftonStrengthsSchema,
} = require("../dist/utils/cliftonStrengths");

test("accepts up to five unique CliftonStrengths themes in rank order", () => {
  const strengths = ["STRATEGIC", "LEARNER", "RELATOR", "ACHIEVER", "RESPONSIBILITY"];

  const parsed = cliftonStrengthsSchema.parse(strengths);

  assert.deepEqual(parsed, strengths);
  assert.equal(CLIFTON_STRENGTHS.length, 34);
});

test("rejects duplicate themes and selections longer than five", () => {
  assert.equal(cliftonStrengthsSchema.safeParse(["STRATEGIC", "STRATEGIC"]).success, false);
  assert.equal(
    cliftonStrengthsSchema.safeParse([
      "STRATEGIC",
      "LEARNER",
      "RELATOR",
      "ACHIEVER",
      "RESPONSIBILITY",
      "EMPATHY",
    ]).success,
    false
  );
});
