CREATE TABLE "ManagerLeavePeriod" (
  "id" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "ManagerLeavePeriod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagerLeavePeriod_userEmail_startsOn_endsOn_idx"
  ON "ManagerLeavePeriod"("userEmail", "startsOn", "endsOn");
