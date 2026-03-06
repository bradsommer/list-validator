import { NextRequest, NextResponse } from 'next/server';
import { getTokens, clearTokens, getAuthorizeUrl } from '@/lib/hubspot';
import { cache, CACHE_KEYS } from '@/lib/cache';

// POST - Revoke any existing HubSpot authorization, then return a fresh authorize URL.
// This forces HubSpot to show the full consent flow (both screens) for unapproved apps,
// instead of auto-redirecting based on a cached previous grant.
export async function POST(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || '';

  try {
    // Check for existing tokens and revoke at HubSpot before clearing locally
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

    // Clear local tokens so isConnected() returns false
    await clearTokens(accountId);
    cache.invalidate(CACHE_KEYS.HUBSPOT_CONNECTION);

    // Generate fresh authorize URL
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
