import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const TOKEN_VERSION = "v1";

export function parseCalendarEncryptionKey(value: string | undefined): Buffer {
  if (!value?.trim()) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must be configured");
  }

  const trimmed = value.trim();
  const key = /^[a-f0-9]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");

  if (key.length !== 32) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters or base64"
    );
  }
  return key;
}

export function encryptCalendarToken(token: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptCalendarToken(value: string, key: Buffer): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");
  if (
    version !== TOKEN_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedCiphertext
  ) {
    throw new Error("Stored calendar token has an unsupported format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encodedIv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
