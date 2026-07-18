CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "senderId" TEXT,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "contact" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "externalId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunicationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CommunicationMessage_externalId_key" ON "CommunicationMessage"("externalId");
CREATE INDEX "CommunicationMessage_leadId_createdAt_idx" ON "CommunicationMessage"("leadId", "createdAt");
CREATE INDEX "CommunicationMessage_channel_createdAt_idx" ON "CommunicationMessage"("channel", "createdAt");
