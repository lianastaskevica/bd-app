import { google } from 'googleapis';
import { getDriveClient } from './google-drive';
import { CALENDAR_CONFIG } from './config';
import { classifyMeeting } from './domain-classifier';

export interface CalendarEvent {
  id: string;
  summary: string | null;
  startTime: Date;
  endTime: Date;
  organizer: string | null;
  attendees: string[];
  hangoutLink: string | null;
  meetCode: string | null;
  attendeesOmitted: boolean;
}

export interface MatchedCalendarEvent extends CalendarEvent {
  classification: {
    isExternal: boolean | null;
    externalDomains: string[];
    classificationSource: string;
    reason?: string;
  };
}

/**
 * Get Calendar client for a user
 */
export async function getCalendarClient(userId: string) {
  // Reuse the same OAuth2 client from Drive
  const driveClient = await getDriveClient(userId);
  const auth = (driveClient as any).context._options.auth;
  
  return google.calendar({ version: 'v3', auth });
}

/**
 * Extract meet code from hangout link
 */
export function extractMeetCode(hangoutLink: string | null): string | null {
  if (!hangoutLink) return null;
  
  // Extract from URLs like: https://meet.google.com/abc-defg-hij
  const match = hangoutLink.match(/meet\.google\.com\/([a-z\-]+)/i);
  return match ? match[1] : null;
}

/**
 * Fetch calendar events for a user in a time window
 */
export async function fetchCalendarEvents(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<CalendarEvent[]> {
  try {
    const calendar = await getCalendarClient(userId);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: CALENDAR_CONFIG.MAX_RESULTS_PER_PAGE,
      fields: 'items(id,summary,start,end,organizer(email),attendees(email,self,organizer,resource),attendeesOmitted,hangoutLink,conferenceData(conferenceId,entryPoints))',
    });

    const events: CalendarEvent[] = [];

    for (const event of (response.data.items || [])) {
      // Only include events with Google Meet
      if (!event.hangoutLink && !event.conferenceData) {
        continue;
      }

      // Extract meet code
      let meetCode = event.conferenceData?.conferenceId || null;
      if (!meetCode && event.hangoutLink) {
        meetCode = extractMeetCode(event.hangoutLink);
      }

      // Extract attendees
      const attendees = (event.attendees || [])
        .filter((a: any) => !a.resource) // Exclude resources
        .map((a: any) => a.email)
        .filter(Boolean) as string[];

      events.push({
        id: event.id!,
        summary: event.summary || null,
        startTime: new Date(event.start?.dateTime || event.start?.date || ''),
        endTime: new Date(event.end?.dateTime || event.end?.date || ''),
        organizer: event.organizer?.email || null,
        attendees,
        hangoutLink: event.hangoutLink || null,
        meetCode,
        attendeesOmitted: event.attendeesOmitted || false,
      });
    }

    return events;
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }
}

/**
 * Match a Drive file/meeting to a calendar event by time
 */
export function matchByTime(
  meetingTime: Date,
  calendarEvents: CalendarEvent[],
  toleranceMinutes: number = CALENDAR_CONFIG.TIME_MATCH_WINDOW_MINUTES
): CalendarEvent | null {
  const meetingMs = meetingTime.getTime();
  const toleranceMs = toleranceMinutes * 60 * 1000;

  let bestMatch: CalendarEvent | null = null;
  let bestDistance = Infinity;

  for (const event of calendarEvents) {
    const eventStartMs = event.startTime.getTime();
    const eventEndMs = event.endTime.getTime();

    // Check if meeting time is within event time range (±tolerance)
    const distanceToStart = Math.abs(meetingMs - eventStartMs);
    const distanceToEnd = Math.abs(meetingMs - eventEndMs);
    const minDistance = Math.min(distanceToStart, distanceToEnd);

    // If within range and closer than previous best match
    if (minDistance <= toleranceMs && minDistance < bestDistance) {
      bestMatch = event;
      bestDistance = minDistance;
    }
  }

  return bestMatch;
}

/**
 * Find and classify a calendar event for a meeting
 */
export async function findAndClassifyCalendarEvent(
  userId: string,
  meetingTime: Date,
  windowMinutes: number = CALENDAR_CONFIG.TIME_MATCH_WINDOW_MINUTES
): Promise<MatchedCalendarEvent | null> {
  try {
    // Define search window
    const windowMs = windowMinutes * 60 * 1000;
    const startTime = new Date(meetingTime.getTime() - windowMs);
    const endTime = new Date(meetingTime.getTime() + windowMs);

    // Fetch calendar events
    const events = await fetchCalendarEvents(userId, startTime, endTime);

    if (events.length === 0) {
      return null;
    }

    // Match by time
    const matchedEvent = matchByTime(meetingTime, events, windowMinutes);

    if (!matchedEvent) {
      return null;
    }

    // Classify the event
    const classification = classifyMeeting(
      matchedEvent.organizer,
      matchedEvent.attendees
    );

    // If attendees are omitted, mark as unknown
    if (matchedEvent.attendeesOmitted) {
      classification.isExternal = null;
      classification.classificationSource = 'unknown';
      classification.reason = 'Attendees omitted by calendar permissions';
    }

    return {
      ...matchedEvent,
      classification,
    };
  } catch (error: any) {
    console.error('Error finding calendar event:', error);
    // Don't throw - just return null if calendar lookup fails
    return null;
  }
}


