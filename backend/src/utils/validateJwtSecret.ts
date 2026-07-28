const PLACEHOLDER_SECRETS = new Set([
  "dev-secret-change-me",
  "change-me-to-a-long-random-string",
]);

export function validateJwtSecret(value: string | undefined): string {
  if (!value || value.length < 32 || PLACEHOLDER_SECRETS.has(value)) {
    throw new Error(
      "JWT_SECRET must be configured with a non-placeholder value of at least 32 characters"
    );
  }
  return value;
}
