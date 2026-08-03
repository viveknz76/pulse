-- Convert calendar-day fields using the Auckland date represented by the
-- existing UTC-by-convention timestamp values.
ALTER TABLE "TeamMember"
  ALTER COLUMN "startDate" TYPE DATE
    USING (("startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland')::date),
  ALTER COLUMN "checkInsResumeOn" TYPE DATE
    USING (("checkInsResumeOn" AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland')::date);

ALTER TABLE "CheckIn"
  ALTER COLUMN "scheduledDate" TYPE DATE
    USING (("scheduledDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland')::date);

ALTER TABLE "ActionItem"
  ALTER COLUMN "dueDate" TYPE DATE
    USING (("dueDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland')::date);

-- Existing timestamp-without-time-zone values have always represented UTC.
-- Make that convention explicit in PostgreSQL without changing the instant.
ALTER TABLE "Team"
  ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ(3) USING ("archivedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

ALTER TABLE "TeamMember"
  ALTER COLUMN "checkInsPausedAt" TYPE TIMESTAMPTZ(3) USING ("checkInsPausedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING ("deletedAt" AT TIME ZONE 'UTC');

ALTER TABLE "CheckIn"
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(3) USING ("completedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING ("deletedAt" AT TIME ZONE 'UTC');

ALTER TABLE "ActionItem"
  ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ(3) USING ("completedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING ("deletedAt" AT TIME ZONE 'UTC');

ALTER TABLE "TalkingPoint"
  ALTER COLUMN "resolvedAt" TYPE TIMESTAMPTZ(3) USING ("resolvedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING ("deletedAt" AT TIME ZONE 'UTC');

ALTER TABLE "CalendarConnection"
  ALTER COLUMN "connectedAt" TYPE TIMESTAMPTZ(3) USING ("connectedAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

ALTER TABLE "CheckInCalendarEvent"
  ALTER COLUMN "startsAt" TYPE TIMESTAMPTZ(3) USING ("startsAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "endsAt" TYPE TIMESTAMPTZ(3) USING ("endsAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');
