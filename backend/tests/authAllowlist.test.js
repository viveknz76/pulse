const assert = require("node:assert/strict");
const test = require("node:test");

process.env.JWT_SECRET = "a".repeat(32);
const { isEmailAllowed } = require("../dist/middleware/auth");

function withAllowlist(config, fn) {
  const keys = ["ALLOWED_EMAILS", "ALLOWED_DOMAIN", "ALLOW_DOMAIN_ACCESS"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, config);
  try {
    fn();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("explicit email addresses are allowed", () => {
  withAllowlist(
    {
      ALLOWED_EMAILS: "owner@example.com,second@example.com",
      ALLOWED_DOMAIN: "",
      ALLOW_DOMAIN_ACCESS: "false",
    },
    () => {
      assert.equal(isEmailAllowed("OWNER@example.com"), true);
      assert.equal(isEmailAllowed("other@example.com"), false);
    }
  );
});

test("domain access requires an explicit opt-in", () => {
  withAllowlist(
    {
      ALLOWED_EMAILS: "",
      ALLOWED_DOMAIN: "example.com",
      ALLOW_DOMAIN_ACCESS: "false",
    },
    () => assert.equal(isEmailAllowed("person@example.com"), false)
  );

  withAllowlist(
    {
      ALLOWED_EMAILS: "",
      ALLOWED_DOMAIN: "example.com",
      ALLOW_DOMAIN_ACCESS: "true",
    },
    () => assert.equal(isEmailAllowed("person@example.com"), true)
  );
});
