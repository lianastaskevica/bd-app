import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getOAuth2Client } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('Drive callback received:', { hasCode: !!code, hasState: !!state, error });

    // Handle user denial
    if (error) {
      console.error('User denied Drive access:', error);
      return NextResponse.redirect(
        new URL(`/integrations?error=google_auth_denied`, request.url)
      );
    }

    if (!code || !state) {
      console.error('Missing code or state in callback');
      return NextResponse.redirect(
        new URL(`/integrations?error=invalid_callback`, request.url)
      );
    }

    // Decode and validate state
    let stateData: { userId: string; csrf: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      console.log('State decoded successfully for userId:', stateData.userId);
      
      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }
    } catch (error) {
      console.error('State validation failed:', error);
      return NextResponse.redirect(
        new URL(`/integrations?error=invalid_state`, request.url)
      );
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      console.error('No refresh token received from Google');
      return NextResponse.redirect(
        new URL(`/integrations?error=no_refresh_token`, request.url)
      );
    }

    console.log('Tokens received successfully');

    // Fetch Google user info
    let googleEmail: string | null = null;
    let googleName: string | null = null;
    
    try {
      console.log('Fetching Google user info...');
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
        console.log('Google user info fetched:', { email: googleEmail, name: googleName });
      } else {
        console.error('Failed to fetch user info, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch Google user info:', error);
      // Continue anyway - we have tokens
    }

    // Verify user exists before storing tokens
    console.log('Verifying user exists in database...');
    const user = await prisma.user.findUnique({
      where: { id: stateData.userId },
    });

    if (!user) {
      console.error('User not found in database:', stateData.userId);
      throw new Error('User not found. Please sign out and sign in again.');
    }

    console.log('User verified:', user.email);

    // Store tokens and user info in database
    console.log('Storing tokens in database for userId:', stateData.userId);
    try {
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
      console.log('Drive connection saved successfully');
    } catch (dbError: any) {
      console.error('Database error saving Drive connection:', dbError);
      throw dbError;
    }

    // Redirect to integrations page
    console.log('Redirecting to integrations with success');
    return NextResponse.redirect(
      new URL('/integrations?google_drive_connected=true', request.url)
    );
  } catch (error: any) {
    console.error('Google auth callback error:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.redirect(
      new URL(`/integrations?error=auth_failed&details=${encodeURIComponent(error.message || 'Unknown error')}`, request.url)
    );
  }
}


