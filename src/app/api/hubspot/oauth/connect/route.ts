import { NextRequest, NextResponse } from 'next/server';
import { getTokens, getAuthorizeUrl } from '@/lib/hubspot';

export const dynamic = 'force-dynamic';

// POST - Revoke any existing HubSpot authorization at HubSpot's end, then return a
// fresh authorize URL.  This forces HubSpot to show the full consent flow (both
// screens) for unapproved apps instead of auto-redirecting based on a cached grant.
//
// IMPORTANT: We do NOT clear local tokens here.  The user's existing connection
// should stay active until the new OAuth flow completes successfully — the callback
// handler will overwrite the tokens when it receives the new code.  This prevents
// the integration from appearing "disconnected" if the user cancels the popup or
// the flow otherwise fails partway through.
export async function POST(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || '';

  try {
    // Revoke existing refresh token at HubSpot so the consent screens are shown again
    const tokens = await getTokens(accountId);
    if (tokens?.refresh_token) {
      try {
        const revokeResponse = await fetch(
          `https://api.hubapi.com/oauth/v1/refresh-tokens/${tokens.refresh_token}`,
          { method: 'DELETE' }
        );
        console.log('HubSpot token revocation status:', revokeResponse.status);
      } catch (err) {
        console.error('Failed to revoke HubSpot token (continuing anyway):', err);
      }
    }

    // Generate fresh authorize URL (tokens are NOT cleared locally)
    const authorizeUrl = await getAuthorizeUrl(accountId);

    return NextResponse.json({ success: true, authorizeUrl });
  } catch (err) {
    console.error('Error preparing HubSpot connect:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to prepare HubSpot connection' },
      { status: 500 }
    );
  }
}
