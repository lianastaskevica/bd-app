import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeCall } from '@/lib/openai';
import OpenAI from 'openai';
import { findAndClassifyCalendarEvent } from '@/lib/calendar-match';

// Helper function to parse participants from transcript text
function parseParticipants(text: string): string[] {
  // Method 1: Look for explicit participant lists
  const listPatterns = [
    /(?:Attendees|Participants|Present|Attendees List):\s*([^\n]+)/i,
    /(?:With|Featuring|Including):\s*([^\n]+)/i,
  ];

  for (const pattern of listPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Split by common separators and clean up
      const participantString = match[1];
      const participants = participantString
        .split(/[,;&]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && p.length < 100); // Reasonable name length

      if (participants.length > 0) {
        return participants;
      }
    }
  }

  // Method 2: Parse dialogue format (Name: text)
  // Look for patterns like "John: Hello" or "Maria: Thanks for joining"
  const dialoguePattern = /^([A-Z][a-zA-Z\s]{1,30}):\s+/gm;
  const matches = text.matchAll(dialoguePattern);
  const speakers = new Set<string>();

  for (const match of matches) {
    const speakerName = match[1].trim();
    // Filter out common false positives
    if (
      speakerName &&
      speakerName.length >= 2 &&
      speakerName.length <= 30 &&
      !speakerName.match(/^(Note|Date|Time|Subject|Re|PS|FYI)$/i)
    ) {
      speakers.add(speakerName);
    }
  }

  if (speakers.size > 0 && speakers.size <= 20) {
    // Reasonable number of speakers
    return Array.from(speakers);
  }

  return [];
}

// AI fallback to extract participants if regex parsing fails
async function extractParticipantsWithAI(text: string): Promise<string[]> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Only use first 2000 chars to save tokens
    const truncatedText = text.slice(0, 2000);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts participant names from meeting transcripts. Return only the names as a JSON array of strings. If no participants found, return an empty array.',
        },
        {
          role: 'user',
          content: `Extract all participant/speaker names from this transcript:\n\n${truncatedText}\n\nReturn only a JSON array like: ["Name1", "Name2"]`,
        },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return [];

    // Parse JSON response
    const participants = JSON.parse(content);
    if (Array.isArray(participants) && participants.length > 0) {
      return participants.filter((p: any) => typeof p === 'string' && p.length > 0);
    }

    return [];
  } catch (error) {
    console.error('AI participant extraction failed:', error);
    return [];
  }
}

// Helper function to extract date from transcript or use file modified date
function extractCallDate(text: string, fileModifiedDate: Date): Date {
  // Try to find date patterns in text
  const datePatterns = [
    /Date:\s*(\d{4}-\d{2}-\d{2})/i,
    /Date:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Fallback to file modified date
  return fileModifiedDate;
}

// Helper function to clean file name for use as client name
function cleanFileName(fileName: string): string {
  // Remove file extension
  let cleaned = fileName.replace(/\.(txt|pdf|docx?|csv)$/i, '');
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(transcript|meeting|call|notes?)[\s\-_:]*/i, '');
  
  // Clean up separators
  cleaned = cleaned.replace(/[\-_]+/g, ' ').trim();
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return cleaned || 'Imported Call';
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { fileIds } = body; // Optional: specific file IDs to import

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

    // Get Google account info for organizer field
    const integration = await prisma.googleIntegration.findUnique({
      where: { userId: session.userId },
      select: { googleName: true, googleEmail: true },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 400 }
      );
    }

    // Use Google account name/email as organizer (the Drive owner)
    const organizer = integration.googleName || integration.googleEmail || 'Unknown';

    // Get DriveFiles that are imported but not yet converted to calls
    const query: any = {
      userId: session.userId,
      status: 'imported',
      calls: {
        none: {}, // Files that don't have any associated calls
      },
    };

    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      query.id = { in: fileIds };
    }

    const driveFiles = await prisma.driveFile.findMany({
      where: query,
      orderBy: { importedAt: 'desc' },
    });

    if (driveFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files available to import' },
        { status: 400 }
      );
    }

    const results = {
      total: driveFiles.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each file
    for (const file of driveFiles) {
      try {
        if (!file.rawText || file.rawText.trim().length === 0) {
          results.failed++;
          results.errors.push(`${file.name}: No text content`);
          continue;
        }

        // Extract metadata
        const clientName = cleanFileName(file.name);
        const callDate = extractCallDate(file.rawText, file.modifiedTime);
        
        // Try to match with Calendar event for participant emails
        let calendarEvent = null;
        let participants: string[] = [];
        let isExternal: boolean | null = null;
        let externalDomains: string[] = [];
        let calendarEventId: string | null = null;
        let classificationSource = 'unknown';
        let meetCode: string | null = null;

        try {
          calendarEvent = await findAndClassifyCalendarEvent(session.userId, callDate);
          
          if (calendarEvent) {
            // Use calendar participants (which include emails)
            const allParticipants = [
              ...(calendarEvent.organizer ? [calendarEvent.organizer] : []),
              ...calendarEvent.attendees,
            ];
            participants = allParticipants.filter(Boolean);
            
            // Use calendar classification
            isExternal = calendarEvent.classification.isExternal;
            externalDomains = calendarEvent.classification.externalDomains;
            calendarEventId = calendarEvent.id;
            classificationSource = calendarEvent.classification.classificationSource;
            meetCode = calendarEvent.meetCode || null;
            
            console.log(`Matched calendar event for ${file.name}:`, {
              eventId: calendarEvent.id,
              isExternal,
              participantCount: participants.length,
            });
          }
        } catch (error: any) {
          console.warn(`Could not match calendar event for ${file.name}:`, error.message);
        }

        // Fallback: Try regex parsing from transcript if no calendar match
        if (participants.length === 0) {
          participants = parseParticipants(file.rawText);
          if (participants.length === 0) {
            // Use AI as last resort
            participants = await extractParticipantsWithAI(file.rawText);
          }
        }

        // Check for duplicates before importing
        if (meetCode) {
          const existingCall = await prisma.call.findFirst({
            where: {
              meetCode,
              callDate,
            },
          });

          if (existingCall) {
            // Skip this call - it's already been imported
            results.failed++;
            results.errors.push(
              `${file.name}: Duplicate - already imported by another team member`
            );
            
            // Update file status to show it was skipped
            await prisma.driveFile.update({
              where: { id: file.id },
              data: {
                status: 'skipped',
                errorMessage: 'Duplicate call - already imported by another user',
              },
            });
            
            continue;
          }
        }

        // Run AI analysis
        const analysis = await analyzeCall(file.rawText, prompt.analysisPrompt, prompt.ratingPrompt);

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
        await prisma.call.create({
          data: {
            clientName,
            callDate,
            organizer,
            participants,
            transcript: file.rawText,
            categoryId: category.id,
            aiAnalysis: analysis.summary,
            aiRating: analysis.rating,
            aiSentiment: analysis.sentiment,
            aiStrengths: analysis.strengths,
            aiAreasForImprovement: analysis.areasForImprovement,
            driveFileId: file.id,
            // External classification fields
            isExternal,
            externalDomains,
            calendarEventId,
            classificationSource,
            // Deduplication tracking
            meetCode,
            isDuplicate: false,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${file.name}: ${error.message}`);
        console.error(`Error importing file ${file.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Import to calls error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import files' },
      { status: 500 }
    );
  }
}

// GET endpoint to check how many files are available to import
export async function GET() {
  try {
    const session = await requireAuth();

    const count = await prisma.driveFile.count({
      where: {
        userId: session.userId,
        status: 'imported',
        calls: {
          none: {},
        },
      },
    });

    const files = await prisma.driveFile.findMany({
      where: {
        userId: session.userId,
        status: 'imported',
        calls: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        modifiedTime: true,
        importedAt: true,
      },
      orderBy: { importedAt: 'desc' },
      take: 50, // Limit for preview
    });

    return NextResponse.json({
      count,
      files,
    });
  } catch (error: any) {
    console.error('Get importable files error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

