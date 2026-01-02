import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Clear all synced Drive data
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { includeImportedCalls } = body;

    // Check if Google Drive is connected
    const integration = await prisma.googleIntegration.findUnique({
      where: { userId: session.userId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 400 }
      );
    }

    let deletedCalls = 0;
    let deletedFiles = 0;

    if (includeImportedCalls) {
      // Delete Call records that were imported from Drive
      const callsResult = await prisma.call.deleteMany({
        where: {
          driveFileId: {
            not: null,
          },
          driveFile: {
            userId: session.userId,
          },
        },
      });
      deletedCalls = callsResult.count;
    } else {
      // Unlink calls from drive files (set driveFileId to null)
      await prisma.call.updateMany({
        where: {
          driveFileId: {
            not: null,
          },
          driveFile: {
            userId: session.userId,
          },
        },
        data: {
          driveFileId: null,
        },
      });
    }

    // Delete all DriveFile records for this user
    const filesResult = await prisma.driveFile.deleteMany({
      where: { userId: session.userId },
    });
    deletedFiles = filesResult.count;

    return NextResponse.json({
      success: true,
      deletedFiles,
      deletedCalls,
      message: includeImportedCalls
        ? `Deleted ${deletedFiles} Drive files and ${deletedCalls} imported calls`
        : `Deleted ${deletedFiles} Drive files. Calls remain but are no longer linked to Drive.`,
    });
  } catch (error: any) {
    console.error('Clear data error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

