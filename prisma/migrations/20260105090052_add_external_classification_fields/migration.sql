-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "isExternal" BOOLEAN,
ADD COLUMN     "externalDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "classificationSource" TEXT;

-- CreateIndex
CREATE INDEX "Call_isExternal_idx" ON "Call"("isExternal");

-- CreateIndex
CREATE INDEX "Call_calendarEventId_idx" ON "Call"("calendarEventId");

