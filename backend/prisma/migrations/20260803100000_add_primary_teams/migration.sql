CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TeamMember" ADD COLUMN "teamId" TEXT;

CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");
CREATE INDEX "Team_archivedAt_idx" ON "Team"("archivedAt");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

ALTER TABLE "TeamMember"
ADD CONSTRAINT "TeamMember_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
