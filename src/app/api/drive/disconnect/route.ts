import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOAuth2Client } from '@/lib/google-drive';

export async function POST() {
  try {
    const session = await requireAuth();

    // Get the integration first to revoke the token
    const integration = await prisma.googleIntegration.findUnique({
      where: { userId: session.userId },
    });

    if (integration) {
      // Revoke the Google token to force new consent on reconnect
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
          refresh_token: integration.refreshToken,
          access_token: integration.accessToken || undefined,
        });
        
        // Revoke the token on Google's side
        await oauth2Client.revokeCredentials();
        console.log('Google token revoked successfully');
      } catch (revokeError) {
        console.error('Failed to revoke Google token (continuing anyway):', revokeError);
        // Continue even if revocation fails - at least delete the DB record
      }

      // Delete integration (cascade will handle related records)
      await prisma.googleIntegration.delete({
        where: { userId: session.userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


