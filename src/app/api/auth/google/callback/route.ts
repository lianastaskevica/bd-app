import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getOAuth2Client } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=google_auth_denied`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=invalid_callback`, request.url)
      );
    }

    // Decode and validate state
    let stateData: { userId: string; csrf: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      
      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }
    } catch (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=invalid_state`, request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=no_refresh_token`, request.url)
      );
    }

    // Fetch Google user info
    let googleEmail: string | null = null;
    let googleName: string | null = null;
    
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(tokens);
      
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );
      
      if (response.ok) {
        const userInfo = await response.json();
        googleEmail = userInfo.email;
        googleName = userInfo.name;
      }
    } catch (error) {
      console.error('Failed to fetch Google user info:', error);
      // Continue anyway - we have tokens
    }

    // Store tokens and user info in database
    await prisma.googleIntegration.upsert({
      where: { userId: stateData.userId },
      create: {
        userId: stateData.userId,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token || null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope?.split(' ') || [],
        googleEmail,
        googleName,
      },
      update: {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token || null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope?.split(' ') || [],
        googleEmail,
        googleName,
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard?google_connected=true', request.url)
    );
  } catch (error: any) {
    console.error('Google auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=auth_failed`, request.url)
    );
  }
}


