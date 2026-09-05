CREATE TABLE "ServiceCatalogItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'unidade',
  "defaultPriceCents" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ServiceCatalogItem_name_key" ON "ServiceCatalogItem"("name");

CREATE TABLE "ServiceClient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "taxId" TEXT,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ServiceClient_name_idx" ON "ServiceClient"("name");

CREATE TABLE "ServiceContract" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME,
  "valueCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ServiceContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ServiceClient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceContract_number_key" ON "ServiceContract"("number");
CREATE INDEX "ServiceContract_status_endsAt_idx" ON "ServiceContract"("status", "endsAt");

CREATE TABLE "ServiceJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contractId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" DATETIME,
  "stage" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ServiceJob_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServiceContract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceJob_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceJob_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ServiceJob_stage_scheduledAt_idx" ON "ServiceJob"("stage", "scheduledAt");
CREATE INDEX "ServiceJob_assigneeId_scheduledAt_idx" ON "ServiceJob"("assigneeId", "scheduledAt");

CREATE TABLE "ServicePhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'EVIDENCE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ServiceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServicePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServicePhoto_filename_key" ON "ServicePhoto"("filename");
CREATE INDEX "ServicePhoto_jobId_createdAt_idx" ON "ServicePhoto"("jobId", "createdAt");
