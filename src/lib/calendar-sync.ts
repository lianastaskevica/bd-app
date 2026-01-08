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
  importedCalls?: number;
  failedImports?: number;
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

    // Auto-import external calls with transcripts
    const importResult = await autoImportExternalCalls(userId);
    
    // Update last sync info (include import stats)
    const syncStatus = result.errors.length === 0 && importResult.failed === 0 ? 'success' : 'partial';
    const allErrors = [...result.errors, ...importResult.errors];
    
    await prisma.googleIntegration.update({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: syncStatus,
        lastSyncError: allErrors.length > 0 ? allErrors.join('; ') : null,
      },
    });

    // Add import stats to result
    (result as any).importedCalls = importResult.imported;
    (result as any).failedImports = importResult.failed;

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
 * Auto-import external calls with transcripts
 * Called after calendar sync to automatically create Call records
 */
export async function autoImportExternalCalls(userId: string): Promise<{
  imported: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Find external calendar events with transcripts that haven't been imported yet
    const eventsToImport = await prisma.calendarEvent.findMany({
      where: {
        userId,
        isExternal: true,
        hasTranscript: true,
        imported: false,
        transcriptFileId: { not: null },
      },
      take: 50, // Limit to 50 events per sync to avoid timeouts
    });

    if (eventsToImport.length === 0) {
      return result;
    }

    console.log(`Auto-importing ${eventsToImport.length} external calls for user ${userId}`);

    // Get active prompt for AI analysis
    const prompt = await prisma.prompt.findFirst({
      where: { isActive: true },
    });

    if (!prompt) {
      result.errors.push('No active prompt found');
      return result;
    }

    // Import the openai and category-classifier functions
    const { analyzeCall } = await import('./openai');
    const { classifyCall } = await import('./category-classifier');

    // Process each event
    for (const event of eventsToImport) {
      try {
        // Get transcript file content
        const transcriptFile = await prisma.driveFile.findUnique({
          where: { id: event.transcriptFileId! },
        });

        if (!transcriptFile || !transcriptFile.rawText) {
          result.errors.push(`${event.summary || 'Untitled'}: Transcript file not found or empty`);
          result.failed++;
          continue;
        }

        // Run AI analysis
        const analysis = await analyzeCall(
          transcriptFile.rawText,
          prompt.analysisPrompt,
          prompt.ratingPrompt
        );

        // Run AI category classification
        const { transcriptSummary, prediction } = await classifyCall(
          event.summary || 'Untitled',
          transcriptFile.rawText
        );

        // Find the predicted category
        const predictedCategory = await prisma.category.findFirst({
          where: { name: prediction.predictedCategory, isFixed: true },
        });

        if (!predictedCategory) {
          result.errors.push(`${event.summary || 'Untitled'}: Invalid category ${prediction.predictedCategory}`);
          result.failed++;
          continue;
        }

        // Determine final category based on confidence
        let categoryFinalId: string | null = null;
        if (prediction.confidence >= 0.5) {
          categoryFinalId = predictedCategory.id;
        }

        // Check for duplicate calls (same meetCode and date)
        let isDuplicate = false;
        let primaryCallId: string | null = null;

        if (event.meetCode) {
          const existingCall = await prisma.call.findFirst({
            where: {
              meetCode: event.meetCode,
              callDate: event.startTime,
            },
          });

          if (existingCall) {
            isDuplicate = true;
            primaryCallId = existingCall.id;
            
            // Mark event as imported (but duplicate)
            await prisma.calendarEvent.update({
              where: { id: event.id },
              data: { imported: true },
            });
            
            result.errors.push(`${event.summary || 'Untitled'}: Duplicate call - already imported`);
            result.failed++;
            continue;
          }
        }

        // Create Call record
        const call = await prisma.call.create({
          data: {
            callTitle: event.summary || 'Untitled Meeting',
            callDate: event.startTime,
            organizer: event.organizer || 'Unknown',
            participants: event.attendees,
            transcript: transcriptFile.rawText,
            
            // AI Analysis
            aiAnalysis: analysis.summary,
            aiRating: analysis.rating,
            aiSentiment: analysis.sentiment,
            aiStrengths: analysis.strengths,
            aiAreasForImprovement: analysis.areasForImprovement,
            
            // AI Category Prediction
            transcriptSummary,
            predictedCategoryId: predictedCategory.id,
            confidenceScore: prediction.confidence,
            categoryReasoning: prediction.reasoning.join('\n'),
            topCandidates: prediction.topCandidates,
            needsReview: prediction.needsReview,
            categoryFinalId,
            
            // External classification
            isExternal: event.isExternal,
            externalDomains: event.externalDomains,
            
            // Link to calendar event
            meetCode: event.meetCode,
          },
        });

        // Mark calendar event as imported
        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: {
            imported: true,
            importedCallId: call.id,
          },
        });

        result.imported++;
        console.log(`✓ Auto-imported: ${event.summary || 'Untitled'}`);
      } catch (error: any) {
        result.failed++;
        result.errors.push(`${event.summary || 'Untitled'}: ${error.message}`);
        console.error(`Error auto-importing event ${event.id}:`, error);
      }
    }

    return result;
  } catch (error: any) {
    console.error('Auto-import error:', error);
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

