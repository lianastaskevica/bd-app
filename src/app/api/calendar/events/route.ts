import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const filter = searchParams.get('filter'); // 'external', 'internal', 'all', 'pending'
    const limit = parseInt(searchParams.get('limit') || '100');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      userId: session.userId,
    };

    // Filter by date range if provided
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Filter by external/internal
    if (filter === 'external') {
      where.isExternal = true;
      where.imported = false;
    } else if (filter === 'internal') {
      where.isExternal = false;
    } else if (filter === 'pending') {
      where.imported = false;
      where.isExternal = true; // Only show external events that haven't been imported
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    // Build where clause for counts (same as events, but without filter-specific conditions)
    const countWhere: any = {
      userId: session.userId,
    };

    // Apply same date range filter to counts
    if (startDate && endDate) {
      countWhere.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get counts for UI - filtered by date range
    const counts = await prisma.calendarEvent.groupBy({
      by: ['isExternal', 'imported'],
      where: countWhere,
      _count: true,
    });

    const summary = {
      total: events.length,
      external: counts.find((c) => c.isExternal === true)?._count || 0,
      internal: counts.find((c) => c.isExternal === false)?._count || 0,
      unknown: counts.find((c) => c.isExternal === null)?._count || 0,
      pending: counts.find((c) => c.isExternal === true && !c.imported)?._count || 0,
    };

    return NextResponse.json({
      events,
      summary,
    });
  } catch (error: any) {
    console.error('Get calendar events error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get calendar events' },
      { status: 500 }
    );
  }
}

