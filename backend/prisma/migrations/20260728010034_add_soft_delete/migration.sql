-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TalkingPoint" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ActionItem_deletedAt_idx" ON "ActionItem"("deletedAt");

-- CreateIndex
CREATE INDEX "CheckIn_deletedAt_idx" ON "CheckIn"("deletedAt");

-- CreateIndex
CREATE INDEX "TalkingPoint_deletedAt_idx" ON "TalkingPoint"("deletedAt");

-- CreateIndex
CREATE INDEX "TeamMember_deletedAt_idx" ON "TeamMember"("deletedAt");
