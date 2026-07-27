-- CreateTable
CREATE TABLE "TalkingPoint" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "teamMemberId" TEXT NOT NULL,
    "checkInId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalkingPoint_teamMemberId_resolved_idx" ON "TalkingPoint"("teamMemberId", "resolved");

-- AddForeignKey
ALTER TABLE "TalkingPoint" ADD CONSTRAINT "TalkingPoint_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalkingPoint" ADD CONSTRAINT "TalkingPoint_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
