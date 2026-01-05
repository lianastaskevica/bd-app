import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchCalendarEvents } from '@/lib/calendar-match';
import { classifyMeeting } from '@/lib/domain-classifier';
import { CALENDAR_CONFIG } from '@/lib/config';
import { getDriveClient, getFileContent } from '@/lib/google-drive';

// Helper to search Drive API directly for transcript files
async function searchDriveForTranscript(
  userId: string,
  event: any
): Promise<{ fileId: string; content: string } | null> {
  try {
    const drive = await getDriveClient(userId);
    
    // Build search query for Google Drive
    const queries = [];
    
    // Search by meeting title if available
    if (event.summary) {
      // Clean up meeting title for search
      const cleanTitle = event.summary
        .replace(/[^\w\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 3) // Use first 3 words
        .join(' ');
      
      if (cleanTitle) {
        queries.push(`name contains '${cleanTitle}'`);
      }
    }
    
    // Search in common folders and file patterns
    const searchPatterns = [
      "(name contains 'transcript' or name contains 'Transcript')",
      "(name contains 'meeting' or name contains 'Meeting')",
      "mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain'",
    ];
    
    // Time-based search - files modified around meeting time
    const toleranceMs = CALENDAR_CONFIG.TIME_MATCH_WINDOW_MINUTES * 60 * 1000;
    const searchStart = new Date(event.startTime.getTime() - toleranceMs);
    const searchEnd = new Date(event.endTime.getTime() + toleranceMs);
    
    const timeQuery = `modifiedTime >= '${searchStart.toISOString()}' and modifiedTime <= '${searchEnd.toISOString()}'`;
    
    // Combine all search patterns
    let fullQuery = `(${searchPatterns.join(' or ')}) and ${timeQuery} and trashed=false`;
    
    // Execute search
    const response = await drive.files.list({
      q: fullQuery,
      fields: 'files(id,name,mimeType,modifiedTime)',
      pageSize: 20,
      orderBy: 'modifiedTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];
    
    if (files.length === 0) {
      return null;
    }

    // Find best match by filename similarity and time proximity
    let bestMatch = files[0];
    let bestScore = 0;

    for (const file of files) {
      let score = 0;
      
      // Score by time proximity (closer = higher score)
      const fileTime = new Date(file.modifiedTime!).getTime();
      const timeDiff = Math.abs(fileTime - event.endTime.getTime());
      const timeScore = Math.max(0, 100 - (timeDiff / (1000 * 60 * 60))); // Decrease score per hour
      score += timeScore;
      
      // Score by filename similarity with meeting title
      if (event.summary && file.name) {
        const titleLower = event.summary.toLowerCase();
        const nameLower = file.name.toLowerCase();
        const titleWords = titleLower.split(/\s+/);
        
        // Count matching words
        let matchingWords = 0;
        for (const word of titleWords) {
          if (word.length > 3 && nameLower.includes(word)) {
            matchingWords++;
          }
        }
        score += matchingWords * 50;
      }
      
      // Bonus for "transcript" in filename
      if (file.name?.toLowerCase().includes('transcript')) {
        score += 30;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = file;
      }
    }

    // Only use if score is reasonable
    if (bestScore < 20) {
      return null;
    }

    // Download/export the file content
    try {
      const content = await getFileContent(userId, bestMatch.id!, bestMatch.mimeType!);
      
      // Store in database for future use
      await prisma.driveFile.upsert({
        where: { googleFileId: bestMatch.id! },
        create: {
          userId,
          googleFileId: bestMatch.id!,
          name: bestMatch.name!,
          mimeType: bestMatch.mimeType!,
          modifiedTime: new Date(bestMatch.modifiedTime!),
          rawText: content,
          status: 'imported',
          importedAt: new Date(),
        },
        update: {
          rawText: content,
          status: 'imported',
          importedAt: new Date(),
        },
      });

      return {
        fileId: bestMatch.id!,
        content,
      };
    } catch (error) {
      console.error('Error downloading transcript:', error);
      return null;
    }
  } catch (error) {
    console.error('Error searching Drive for transcript:', error);
    return null;
  }
}

// Helper to find transcript file for a calendar event
async function findTranscriptForEvent(
  userId: string,
  event: any
): Promise<string | null> {
  try {
    // First check if we already have it in database
    const toleranceMs = CALENDAR_CONFIG.TIME_MATCH_WINDOW_MINUTES * 60 * 1000;
    const searchStart = new Date(event.startTime.getTime() - toleranceMs);
    const searchEnd = new Date(event.endTime.getTime() + toleranceMs);

    const existingFile = await prisma.driveFile.findFirst({
      where: {
        userId,
        status: 'imported',
        modifiedTime: {
          gte: searchStart,
          lte: searchEnd,
        },
        rawText: {
          not: null,
        },
      },
      orderBy: { modifiedTime: 'desc' },
    });

    if (existingFile) {
      return existingFile.id;
    }

    // Not in database - search Drive API directly
    const transcript = await searchDriveForTranscript(userId, event);
    
    if (transcript) {
      // Find the database record we just created
      const driveFile = await prisma.driveFile.findUnique({
        where: { googleFileId: transcript.fileId },
      });
      
      return driveFile?.id || null;
    }

    return null;
  } catch (error) {
    console.error('Error finding transcript:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Convert to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Fetch calendar events
    const events = await fetchCalendarEvents(session.userId, start, end);

    const results = {
      total: events.length,
      synced: 0,
      updated: 0,
      externalEvents: 0,
      internalEvents: 0,
      unknownEvents: 0,
    };

    // Store events in database
    for (const event of events) {
      // Classify the event
      const classification = classifyMeeting(event.organizer, event.attendees);

      // Handle attendees omitted case
      let isExternal: boolean | null = classification.isExternal;
      let externalDomains = classification.externalDomains;
      
      if (event.attendeesOmitted) {
        isExternal = null;
        externalDomains = [];
      }

      // Track counts
      if (isExternal === true) results.externalEvents++;
      else if (isExternal === false) results.internalEvents++;
      else results.unknownEvents++;

      // Check if transcript exists in Drive
      const transcriptFileId = await findTranscriptForEvent(session.userId, event);
      const hasTranscript = transcriptFileId !== null;

      // Upsert calendar event
      const existing = await prisma.calendarEvent.findUnique({
        where: {
          userId_googleEventId: {
            userId: session.userId,
            googleEventId: event.id,
          },
        },
      });

      await prisma.calendarEvent.upsert({
        where: {
          userId_googleEventId: {
            userId: session.userId,
            googleEventId: event.id,
          },
        },
        create: {
          userId: session.userId,
          googleEventId: event.id,
          summary: event.summary,
          startTime: event.startTime,
          endTime: event.endTime,
          organizer: event.organizer,
          attendees: event.attendees,
          attendeesOmitted: event.attendeesOmitted,
          hangoutLink: event.hangoutLink,
          meetCode: event.meetCode,
          isExternal,
          externalDomains,
          hasTranscript,
          transcriptFileId,
          syncedAt: new Date(),
        },
        update: {
          summary: event.summary,
          startTime: event.startTime,
          endTime: event.endTime,
          organizer: event.organizer,
          attendees: event.attendees,
          attendeesOmitted: event.attendeesOmitted,
          hangoutLink: event.hangoutLink,
          meetCode: event.meetCode,
          isExternal,
          externalDomains,
          hasTranscript,
          transcriptFileId,
          syncedAt: new Date(),
        },
      });

      if (existing) {
        results.updated++;
      } else {
        results.synced++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync calendar' },
      { status: 500 }
    );
  }
}

