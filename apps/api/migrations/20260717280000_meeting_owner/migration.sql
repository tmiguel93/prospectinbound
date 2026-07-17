ALTER TABLE "Meeting" ADD COLUMN "ownerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Meeting_ownerId_idx" ON "Meeting"("ownerId");
