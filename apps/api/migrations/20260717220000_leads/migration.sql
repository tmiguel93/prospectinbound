CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "establishmentName" TEXT NOT NULL, "contactName" TEXT, "phone" TEXT, "whatsapp" TEXT, "email" TEXT, "city" TEXT, "state" TEXT,
    "productId" TEXT NOT NULL, "pipelineId" TEXT NOT NULL, "stageId" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'Prospecção própria', "ownerId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0, "priority" TEXT NOT NULL DEFAULT 'Normal', "nextAction" TEXT, "nextActionAt" DATETIME, "lastContactAt" DATETIME, "notes" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "type" TEXT NOT NULL, "content" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "LeadStageHistory" (
    "id" TEXT NOT NULL PRIMARY KEY, "leadId" TEXT NOT NULL, "userId" TEXT, "previousId" TEXT, "nextId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadStageHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Lead_pipelineId_stageId_idx" ON "Lead"("pipelineId", "stageId");
CREATE INDEX "Lead_productId_idx" ON "Lead"("productId");
