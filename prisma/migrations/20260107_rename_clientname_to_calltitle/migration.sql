-- Rename clientName column to callTitle in Call table
ALTER TABLE "Call" RENAME COLUMN "clientName" TO "callTitle";

-- Drop old index on clientName
DROP INDEX IF EXISTS "Call_clientName_idx";

-- Create new index on callTitle
CREATE INDEX "Call_callTitle_idx" ON "Call"("callTitle");

