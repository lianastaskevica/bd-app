import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await requireAuth();

    // Check if Google Drive is connected
    const integration = await prisma.googleIntegration.findUnique({
      where: { userId: session.userId },
    });

    if (!integration) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Get folder sources
    const sources = await prisma.driveSource.findMany({
      where: { userId: session.userId },
      orderBy: { lastSync: 'desc' },
    });

    // Get file stats
    const totalFiles = await prisma.driveFile.count({
      where: { userId: session.userId },
    });

    const importedFiles = await prisma.driveFile.count({
      where: {
        userId: session.userId,
        status: 'imported',
      },
    });

    const errorFiles = await prisma.driveFile.count({
      where: {
        userId: session.userId,
        status: 'error',
      },
    });

    // Get most recent sync time
    const mostRecentSource = sources[0];
    const lastSyncTime = mostRecentSource?.lastSync || null;

    return NextResponse.json({
      connected: true,
      connectedAt: integration.connectedAt,
      folders: sources.length,
      lastSyncTime,
      stats: {
        total: totalFiles,
        imported: importedFiles,
        errors: errorFiles,
      },
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


