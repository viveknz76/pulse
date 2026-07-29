ALTER TABLE "TalkingPoint"
ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "renewedFromId" TEXT;

CREATE UNIQUE INDEX "TalkingPoint_renewedFromId_key" ON "TalkingPoint"("renewedFromId");

ALTER TABLE "TalkingPoint"
ADD CONSTRAINT "TalkingPoint_renewedFromId_fkey"
FOREIGN KEY ("renewedFromId") REFERENCES "TalkingPoint"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
