ALTER TABLE "User" ADD COLUMN "monthlyGoalCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Lead" ADD COLUMN "estimatedValueCents" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "expectedCloseAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "lossReason" TEXT;
ALTER TABLE "Lead" ADD COLUMN "outcomeAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "consentCapturedAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "consentSource" TEXT;
ALTER TABLE "Lead" ADD COLUMN "legalBasis" TEXT;
ALTER TABLE "Lead" ADD COLUMN "anonymizedAt" DATETIME;

CREATE TABLE "MessageTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "MessageTemplate_name_key" ON "MessageTemplate"("name");
