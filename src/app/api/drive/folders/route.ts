import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractFolderId, getFolderMetadata } from '@/lib/google-drive';

// GET - List all configured folders for the user
export async function GET() {
  try {
    const session = await requireAuth();

    const sources = await prisma.driveSource.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(sources);
  } catch (error: any) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new folder to sync
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { folderUrlOrId } = body;

    if (!folderUrlOrId) {
      return NextResponse.json(
        { error: 'Folder URL or ID is required' },
        { status: 400 }
      );
    }

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

    // Extract folder ID from URL
    const folderId = extractFolderId(folderUrlOrId);

    // Verify folder exists and get metadata
    let folderMetadata;
    try {
      folderMetadata = await getFolderMetadata(session.userId, folderId);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Unable to access folder. Please check permissions.' },
        { status: 403 }
      );
    }

    // Check if folder already added
    const existing = await prisma.driveSource.findUnique({
      where: {
        userId_folderId: {
          userId: session.userId,
          folderId: folderId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This folder is already added' },
        { status: 400 }
      );
    }

    // Create folder source
    const source = await prisma.driveSource.create({
      data: {
        userId: session.userId,
        folderId: folderId,
        folderName: folderMetadata.name || null,
        status: 'active',
      },
    });

    return NextResponse.json(source);
  } catch (error: any) {
    console.error('Add folder error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a folder
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('id');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const source = await prisma.driveSource.findUnique({
      where: { id: sourceId },
    });

    if (!source || source.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    await prisma.driveSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


