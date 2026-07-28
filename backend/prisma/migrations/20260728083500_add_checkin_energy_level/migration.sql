-- An optional 1-5 starting-energy pulse captured at the beginning of a check-in.
ALTER TABLE "CheckIn" ADD COLUMN "energyLevel" INTEGER;

ALTER TABLE "CheckIn"
ADD CONSTRAINT "CheckIn_energyLevel_range"
CHECK ("energyLevel" IS NULL OR ("energyLevel" >= 1 AND "energyLevel" <= 5));
