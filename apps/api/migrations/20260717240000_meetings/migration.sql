CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "title" TEXT NOT NULL, "startsAt" DATETIME NOT NULL, "endsAt" DATETIME NOT NULL, "format" TEXT NOT NULL, "link" TEXT, "location" TEXT, "notes" TEXT, "status" TEXT NOT NULL DEFAULT 'SCHEDULED', "result" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Meeting_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Meeting_startsAt_idx" ON "Meeting"("startsAt");
