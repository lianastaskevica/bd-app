import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeCall } from '@/lib/openai';
import { CALENDAR_CONFIG } from '@/lib/config';

// Helper to find transcript file for a calendar event
async function findTranscriptForEvent(
  userId: string,
  event: any
): Promise<any | null> {
  // Search for Drive files within time window of the event
  const toleranceMs = CALENDAR_CONFIG.TIME_MATCH_WINDOW_MINUTES * 60 * 1000;
  const searchStart = new Date(event.startTime.getTime() - toleranceMs);
  const searchEnd = new Date(event.endTime.getTime() + toleranceMs);

  const files = await prisma.driveFile.findMany({
    where: {
      userId,
      status: 'imported',
      modifiedTime: {
        gte: searchStart,
        lte: searchEnd,
      },
      calls: {
        none: {}, // Not already imported
      },
    },
    orderBy: { modifiedTime: 'desc' },
  });

  if (files.length === 0) return null;

  // Find closest match by time
  let bestMatch = files[0];
  let bestDistance = Math.abs(
    files[0].modifiedTime.getTime() - event.endTime.getTime()
  );

  for (const file of files) {
    const distance = Math.abs(
      file.modifiedTime.getTime() - event.endTime.getTime()
    );
    if (distance < bestDistance) {
      bestMatch = file;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { eventIds } = body; // Array of calendar event IDs to import

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { error: 'Event IDs are required' },
        { status: 400 }
      );
    }

    // Get the active prompt for AI analysis
    const prompt = await prisma.prompt.findFirst({
      where: { isActive: true },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'No active prompt found. Please create and activate a prompt first.' },
        { status: 400 }
      );
    }

    // Get calendar events
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: {
        id: { in: eventIds },
        userId: session.userId,
        imported: false,
      },
    });

    const results = {
      total: calendarEvents.length,
      success: 0,
      failed: 0,
      noTranscript: 0,
      errors: [] as string[],
    };

    // Process each calendar event
    for (const event of calendarEvents) {
      try {
        // Find matching transcript file
        const transcriptFile = await findTranscriptForEvent(session.userId, event);

        if (!transcriptFile || !transcriptFile.rawText) {
          results.noTranscript++;
          results.errors.push(
            `${event.summary || 'Untitled'}: No transcript file found`
          );
          continue;
        }

        // Use event summary as client name, fallback to file name
        const clientName = event.summary || transcriptFile.name.replace(/\.(txt|pdf|docx?)$/i, '');

        // Run AI analysis
        const analysis = await analyzeCall(transcriptFile.rawText, prompt.analysisPrompt, prompt.ratingPrompt);

        // Find or create category
        let category = await prisma.category.findFirst({
          where: { name: analysis.category },
        });

        if (!category) {
          category = await prisma.category.create({
            data: { name: analysis.category },
          });
        }

        // Create Call record
        const call = await prisma.call.create({
          data: {
            clientName,
            callDate: event.startTime,
            organizer: event.organizer || 'Unknown',
            participants: event.attendees,
            transcript: transcriptFile.rawText,
            categoryId: category.id,
            aiAnalysis: analysis.summary,
            aiRating: analysis.rating,
            aiSentiment: analysis.sentiment,
            aiStrengths: analysis.strengths,
            aiAreasForImprovement: analysis.areasForImprovement,
            driveFileId: transcriptFile.id,
            // External classification from calendar event
            isExternal: event.isExternal,
            externalDomains: event.externalDomains,
            calendarEventId: event.googleEventId,
            classificationSource: 'calendar',
          },
        });

        // Update calendar event as imported
        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: {
            imported: true,
            importedCallId: call.id,
            hasTranscript: true,
            transcriptFileId: transcriptFile.id,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `${event.summary || 'Untitled'}: ${error.message}`
        );
        console.error(`Error importing calendar event ${event.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Calendar import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import calendar events' },
      { status: 500 }
    );
  }
}

