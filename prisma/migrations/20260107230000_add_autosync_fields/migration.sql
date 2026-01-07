-- AlterTable: Add auto-sync fields to GoogleIntegration
ALTER TABLE "GoogleIntegration" ADD COLUMN "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "GoogleIntegration" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "GoogleIntegration" ADD COLUMN "lastSyncStatus" TEXT;
ALTER TABLE "GoogleIntegration" ADD COLUMN "lastSyncError" TEXT;

