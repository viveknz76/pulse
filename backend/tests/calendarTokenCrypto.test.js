const assert = require("node:assert/strict");
const test = require("node:test");
const {
  decryptCalendarToken,
  encryptCalendarToken,
  parseCalendarEncryptionKey,
} = require("../dist/utils/calendarTokenCrypto");

test("calendar refresh tokens round-trip through authenticated encryption", () => {
  const key = parseCalendarEncryptionKey("ab".repeat(32));
  const encrypted = encryptCalendarToken("refresh-token-value", key);

  assert.notEqual(encrypted, "refresh-token-value");
  assert.equal(decryptCalendarToken(encrypted, key), "refresh-token-value");
});

test("calendar token encryption rejects missing or malformed keys", () => {
  assert.throws(() => parseCalendarEncryptionKey(undefined), /must be configured/);
  assert.throws(() => parseCalendarEncryptionKey("too-short"), /must be 32 bytes/);
});

test("calendar token decryption rejects tampering", () => {
  const key = parseCalendarEncryptionKey(Buffer.alloc(32, 7).toString("base64"));
  const encrypted = encryptCalendarToken("refresh-token-value", key);
  const parts = encrypted.split(".");
  const ciphertext = Buffer.from(parts[3], "base64url");
  ciphertext[0] ^= 1;
  parts[3] = ciphertext.toString("base64url");

  assert.throws(() => decryptCalendarToken(parts.join("."), key));
});
