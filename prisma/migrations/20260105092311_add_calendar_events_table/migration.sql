-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "organizer" TEXT,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attendeesOmitted" BOOLEAN NOT NULL DEFAULT false,
    "hangoutLink" TEXT,
    "meetCode" TEXT,
    "isExternal" BOOLEAN,
    "externalDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasTranscript" BOOLEAN NOT NULL DEFAULT false,
    "transcriptFileId" TEXT,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "importedCallId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_startTime_idx" ON "CalendarEvent"("startTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_isExternal_idx" ON "CalendarEvent"("isExternal");

-- CreateIndex
CREATE INDEX "CalendarEvent_imported_idx" ON "CalendarEvent"("imported");

-- CreateIndex
CREATE INDEX "CalendarEvent_hasTranscript_idx" ON "CalendarEvent"("hasTranscript");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_userId_googleEventId_key" ON "CalendarEvent"("userId", "googleEventId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

