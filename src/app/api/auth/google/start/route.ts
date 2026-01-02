import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAuthorizationUrl } from '@/lib/google-drive';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Generate state token for CSRF protection
    // In production, store this in Redis/DB with expiry
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


