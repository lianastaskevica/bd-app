/**
 * Calendar Sync Utility
 * 
 * Handles automatic syncing of Google Calendar events and importing them as calls.
 * Used by the cron job to periodically sync calendars for all connected users.
 */

import { prisma } from './prisma';
import { fetchCalendarEvents } from './calendar-match';
import { getDriveClient, getFileContent } from './google-drive';
import { CALENDAR_CONFIG } from './config';

export interface SyncResult {
  success: boolean;
  newEvents: number;
  updatedEvents: number;
  errors: string[];
}

/**
 * Sync calendar events for a specific user
 * 
 * @param userId - The user ID to sync calendar for
 * @param startDate - Start date for sync (defaults to 7 days ago)
 * @param endDate - End date for sync (defaults to 7 days from now)
 */
export async function syncUserCalendar(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    newEvents: 0,
    updatedEvents: 0,
    errors: [],
  };

  try {
    // Get user's Google integration
    const integration = await prisma.googleIntegration.findUnique({
      where: { userId },
    });

    if (!integration || !integration.refreshToken) {
      throw new Error('No Google integration found for user');
    }

    // Default date range: 7 days ago to 7 days from now
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }
    if (!endDate) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
    }

    // Fetch calendar events from Google
    const events = await fetchCalendarEvents(
      userId,
      startDate,
      endDate
    );

    // Process each event (cast to MatchedCalendarEvent for classification data)
    for (const event of events as any[]) {
      try {
        // Check if event already exists
        const existingEvent = await prisma.calendarEvent.findFirst({
          where: {
            userId,
            googleEventId: event.id,
          },
        });

        // Check for duplicates across users (same meeting)
        let isDuplicate = false;
        let primaryEventId: string | null = null;
        let primaryUserId: string | null = null;

        if (event.meetCode) {
          const duplicateCheck = await prisma.calendarEvent.findFirst({
            where: {
              googleEventId: event.id,
              NOT: { userId },
            },
          });

          if (duplicateCheck) {
            isDuplicate = true;
            primaryEventId = duplicateCheck.id;
            primaryUserId = duplicateCheck.userId;
          }
        }

        // Try to find transcript file in Google Drive
        let hasTranscript = false;
        let transcriptFileId: string | null = null;

        if (event.meetCode && event.classification?.isExternal && !isDuplicate) {
          try {
            const drive = await getDriveClient(userId);
            
            // Search for transcript files around the meeting time
            const toleranceMs = CALENDAR_CONFIG.TIME_MATCH_WINDOW_MINUTES * 60 * 1000;
            const searchStart = new Date(event.startTime.getTime() - toleranceMs);
            const searchEnd = new Date(event.endTime.getTime() + toleranceMs);
            
            const timeQuery = `modifiedTime >= '${searchStart.toISOString()}' and modifiedTime <= '${searchEnd.toISOString()}'`;
            const searchPatterns = [
              "(name contains 'transcript' or name contains 'Transcript')",
              "mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain'",
            ];
            
            const fullQuery = `(${searchPatterns.join(' or ')}) and ${timeQuery} and trashed=false`;
            
            const response = await drive.files.list({
              q: fullQuery,
              fields: 'files(id,name,mimeType,modifiedTime)',
              pageSize: 10,
              orderBy: 'modifiedTime desc',
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
            });

            const files = response.data.files || [];
            
            if (files.length > 0) {
              // Use the most recent file as the transcript
              hasTranscript = true;
              transcriptFileId = files[0].id || null;
            }
          } catch (driveError) {
            console.warn(`Could not search for transcript for event ${event.id}:`, driveError);
          }
        }

        if (existingEvent) {
          // Update existing event
          await prisma.calendarEvent.update({
            where: { id: existingEvent.id },
            data: {
              summary: event.summary,
              startTime: event.startTime,
              endTime: event.endTime,
              attendees: event.attendees,
              organizer: event.organizer,
              meetCode: event.meetCode,
              hangoutLink: event.hangoutLink,
            isExternal: event.classification?.isExternal || null,
            externalDomains: event.classification?.externalDomains || [],
            hasTranscript,
              transcriptFileId,
              isDuplicate,
              primaryEventId,
              primaryUserId,
              updatedAt: new Date(),
            },
          });
          result.updatedEvents++;
        } else {
          // Create new event
          await prisma.calendarEvent.create({
            data: {
              userId,
              googleEventId: event.id,
              summary: event.summary,
              startTime: event.startTime,
              endTime: event.endTime,
              attendees: event.attendees,
              organizer: event.organizer,
              meetCode: event.meetCode,
              hangoutLink: event.hangoutLink,
            isExternal: event.classification?.isExternal || null,
            externalDomains: event.classification?.externalDomains || [],
            hasTranscript,
              transcriptFileId,
              isDuplicate,
              primaryEventId,
              primaryUserId,
            },
          });
          result.newEvents++;
        }
      } catch (eventError: any) {
        console.error(`Error processing event ${event.id}:`, eventError);
        result.errors.push(`Event ${event.summary || event.id}: ${eventError.message}`);
      }
    }

    // Update last sync info
    await prisma.googleIntegration.update({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: result.errors.length === 0 ? 'success' : 'partial',
        lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
      },
    });

    result.success = true;
    return result;
  } catch (error: any) {
    console.error(`Failed to sync calendar for user ${userId}:`, error);
    
    // Update last sync with error
    try {
      await prisma.googleIntegration.update({
        where: { userId },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: 'failed',
          lastSyncError: error.message,
        },
      });
    } catch (updateError) {
      console.error('Failed to update sync status:', updateError);
    }

    result.errors.push(error.message);
    return result;
  }
}

/**
 * Get sync status for a user
 */
export async function getUserSyncStatus(userId: string) {
  const integration = await prisma.googleIntegration.findUnique({
    where: { userId },
    select: {
      autoSyncEnabled: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
    },
  });

  return integration;
}

/**
 * Enable/disable auto-sync for a user
 */
export async function setAutoSyncEnabled(userId: string, enabled: boolean) {
  await prisma.googleIntegration.update({
    where: { userId },
    data: {
      autoSyncEnabled: enabled,
    },
  });
}

