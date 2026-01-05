import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchCalendarEvents } from '@/lib/calendar-match';
import { classifyMeeting } from '@/lib/domain-classifier';

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

