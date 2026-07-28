-- Retire older duplicate empty check-ins created before the uniqueness rule.
-- Records are soft-deleted so they remain recoverable for audit purposes.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "teamMemberId"
      ORDER BY "scheduledDate" DESC, "createdAt" DESC
    ) AS position
  FROM "CheckIn"
  WHERE "status" = 'SCHEDULED' AND "deletedAt" IS NULL
)
UPDATE "CheckIn"
SET "deletedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1)
  AND COALESCE("wins", '') = ''
  AND COALESCE("challenges", '') = ''
  AND COALESCE("growthNotes", '') = ''
  AND NOT EXISTS (
    SELECT 1 FROM "ActionItem"
    WHERE "ActionItem"."checkInId" = "CheckIn"."id"
      AND "ActionItem"."deletedAt" IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM "TalkingPoint"
    WHERE "TalkingPoint"."checkInId" = "CheckIn"."id"
      AND "TalkingPoint"."deletedAt" IS NULL
  );

-- PostgreSQL partial indexes express the rule without blocking historical or
-- soft-deleted scheduled records.
CREATE UNIQUE INDEX "CheckIn_one_active_per_team_member_key"
ON "CheckIn"("teamMemberId")
WHERE "status" = 'SCHEDULED' AND "deletedAt" IS NULL;
