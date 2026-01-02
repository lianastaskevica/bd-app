import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAuthorizationUrl } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    console.log('Drive auth start - session userId:', session.userId);

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      console.error('User not found in database:', session.userId);
      return NextResponse.json(
        { error: 'User not found. Please sign out and sign in again.' },
        { status: 404 }
      );
    }

    console.log('User verified:', user.email);

    // Generate state token for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.userId,
        csrf: crypto.randomBytes(16).toString('hex'),
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl = getAuthorizationUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Google auth start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start authorization' },
      { status: 500 }
    );
  }
}


