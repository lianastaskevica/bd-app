/**
 * Vercel Cron Job: Sync Calendars
 * 
 * This endpoint is automatically triggered by Vercel Cron on a schedule.
 * It syncs calendar events for all users who have Google Calendar connected
 * and have auto-sync enabled.
 * 
 * Security: Only accessible via Vercel Cron (verified by CRON_SECRET)
 * Schedule: Configured in vercel.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncUserCalendar } from '@/lib/calendar-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      console.error('Unauthorized cron attempt:', authHeader);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting calendar sync cron job...');

    // Get all users with active Google connections and auto-sync enabled
    const integrations = await prisma.googleIntegration.findMany({
      where: {
        AND: [
          { refreshToken: { not: '' } },
          { autoSyncEnabled: true },
        ],
      },
      select: {
        userId: true,
        googleEmail: true,
        lastSyncedAt: true,
      },
    });

    console.log(`Found ${integrations.length} users to sync`);

    const results = {
      total: integrations.length,
      success: 0,
      failed: 0,
      totalNewEvents: 0,
      totalUpdatedEvents: 0,
      totalImportedCalls: 0,
      totalFailedImports: 0,
      errors: [] as Array<{ userId: string; email: string | null; error: string }>,
    };

    // Sync each user's calendar
    for (const integration of integrations) {
      try {
        console.log(`Syncing calendar for user ${integration.userId} (${integration.googleEmail || 'unknown'})`);

        // Sync last 7 days + next 7 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const syncResult = await syncUserCalendar(
          integration.userId,
          startDate,
          endDate
        );

        if (syncResult.success) {
          results.success++;
          results.totalNewEvents += syncResult.newEvents;
          results.totalUpdatedEvents += syncResult.updatedEvents;
          results.totalImportedCalls += syncResult.importedCalls || 0;
          results.totalFailedImports += syncResult.failedImports || 0;
          console.log(
            `✓ Synced ${integration.googleEmail}: ` +
            `${syncResult.newEvents} new, ${syncResult.updatedEvents} updated, ` +
            `${syncResult.importedCalls || 0} calls imported`
          );
        } else {
          results.failed++;
          results.errors.push({
            userId: integration.userId,
            email: integration.googleEmail,
            error: syncResult.errors.join('; '),
          });
          console.error(`✗ Failed to sync ${integration.googleEmail}:`, syncResult.errors);
        }

        // Add small delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId: integration.userId,
          email: integration.googleEmail,
          error: error.message,
        });
        console.error(`✗ Error syncing user ${integration.userId}:`, error);
      }
    }

    console.log('Calendar sync completed:', {
      total: results.total,
      success: results.success,
      failed: results.failed,
      newEvents: results.totalNewEvents,
      updatedEvents: results.totalUpdatedEvents,
      importedCalls: results.totalImportedCalls,
      failedImports: results.totalFailedImports,
    });

    return NextResponse.json({
      success: true,
      message: 'Calendar sync completed',
      results: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        newEvents: results.totalNewEvents,
        updatedEvents: results.totalUpdatedEvents,
        importedCalls: results.totalImportedCalls,
        failedImports: results.totalFailedImports,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

