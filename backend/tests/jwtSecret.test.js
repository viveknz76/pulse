const assert = require("node:assert/strict");
const test = require("node:test");
const { validateJwtSecret } = require("../dist/utils/validateJwtSecret");

test("validateJwtSecret accepts a strong configured secret", () => {
  const secret = "a".repeat(32);
  assert.equal(validateJwtSecret(secret), secret);
});

test("validateJwtSecret rejects missing, short, and placeholder secrets", () => {
  for (const secret of [
    undefined,
    "",
    "too-short",
    "dev-secret-change-me",
    "change-me-to-a-long-random-string",
  ]) {
    assert.throws(() => validateJwtSecret(secret), /JWT_SECRET must be configured/);
  }
});
