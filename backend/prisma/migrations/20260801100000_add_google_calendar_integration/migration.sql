-- Store one delegated Google Calendar connection per authorized Pulse user.
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "googleAccountEmail" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "scope" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckInCalendarEvent" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "htmlLink" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarConnection_userEmail_key" ON "CalendarConnection"("userEmail");
CREATE UNIQUE INDEX "CheckInCalendarEvent_userEmail_googleEventId_key"
ON "CheckInCalendarEvent"("userEmail", "googleEventId");
CREATE INDEX "CheckInCalendarEvent_teamMemberId_startsAt_idx"
ON "CheckInCalendarEvent"("teamMemberId", "startsAt");
CREATE INDEX "CheckInCalendarEvent_userEmail_startsAt_idx"
ON "CheckInCalendarEvent"("userEmail", "startsAt");

ALTER TABLE "CheckInCalendarEvent"
ADD CONSTRAINT "CheckInCalendarEvent_userEmail_fkey"
FOREIGN KEY ("userEmail") REFERENCES "CalendarConnection"("userEmail")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckInCalendarEvent"
ADD CONSTRAINT "CheckInCalendarEvent_teamMemberId_fkey"
FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
