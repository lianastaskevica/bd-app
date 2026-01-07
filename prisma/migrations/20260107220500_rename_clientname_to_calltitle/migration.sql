-- AlterTable
ALTER TABLE "Call" RENAME COLUMN "clientName" TO "callTitle";

-- DropIndex (drop old index)
DROP INDEX IF EXISTS "Call_clientName_idx";

-- CreateIndex (create new index)
CREATE INDEX "Call_callTitle_idx" ON "Call"("callTitle");

