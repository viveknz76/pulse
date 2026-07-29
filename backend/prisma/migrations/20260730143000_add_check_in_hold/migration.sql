ALTER TABLE "TeamMember"
ADD COLUMN "checkInsPausedAt" TIMESTAMP(3),
ADD COLUMN "checkInsResumeOn" TIMESTAMP(3),
ADD COLUMN "checkInsHoldReason" TEXT;
