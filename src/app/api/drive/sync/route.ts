import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { syncAllFolders, syncFolder } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { folderId } = body;

    // Check if Google Drive is connected
    const integration = await prisma.googleIntegration.findUnique({
      where: { userId: session.userId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Google Drive not connected. Please connect first.' },
        { status: 400 }
      );
    }

    let results;

    if (folderId) {
      // Sync specific folder
      const source = await prisma.driveSource.findFirst({
        where: {
          userId: session.userId,
          folderId: folderId,
        },
      });

      if (!source) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }

      results = await syncFolder(session.userId, folderId);
    } else {
      // Sync all folders
      results = await syncAllFolders(session.userId);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}


