-- Add duplicate detection fields to Call table
ALTER TABLE "Call" ADD COLUMN "meetCode" TEXT;
ALTER TABLE "Call" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Call" ADD COLUMN "primaryCallId" TEXT;
ALTER TABLE "Call" ADD COLUMN "duplicateOfUserId" TEXT;

-- Add indexes for Call duplicate detection
CREATE INDEX "Call_meetCode_idx" ON "Call"("meetCode");
CREATE INDEX "Call_isDuplicate_idx" ON "Call"("isDuplicate");

-- Add duplicate detection fields to CalendarEvent table
ALTER TABLE "CalendarEvent" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CalendarEvent" ADD COLUMN "primaryEventId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "primaryUserId" TEXT;

-- Add indexes for CalendarEvent duplicate detection
CREATE INDEX "CalendarEvent_meetCode_idx" ON "CalendarEvent"("meetCode");
CREATE INDEX "CalendarEvent_isDuplicate_idx" ON "CalendarEvent"("isDuplicate");

