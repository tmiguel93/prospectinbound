CREATE TABLE "LeadQualificationResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerJson" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeadQualificationResponse_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadQualificationResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ProductQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LeadQualificationResponse_leadId_questionId_key" ON "LeadQualificationResponse"("leadId", "questionId");
