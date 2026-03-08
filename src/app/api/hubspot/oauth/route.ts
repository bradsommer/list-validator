import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizeUrl, getHubSpotClientIdAsync, isConnected, getTokens, getValidAccessToken, getPortalId, clearTokens } from '@/lib/hubspot';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';
import { removeAllHubSpotHeadingsAsync } from '@/lib/columnHeadings';

interface ConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
  portalId: string | null;
}

// GET - returns connection status or redirect URL
export async function GET(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || '';

  // Check per-account cache for connection status
  const connectionCacheKey = CACHE_KEYS.hubspotConnection(accountId);
  const cached = cache.get<ConnectionStatus>(connectionCacheKey);
  if (cached) {
    // Only generate authorize URL if we have a client ID configured
    let authorizeUrl: string | null = null;
    if (!cached.connected) {
      const clientId = await getHubSpotClientIdAsync();
      if (clientId) authorizeUrl = await getAuthorizeUrl(accountId);
    }
    return NextResponse.json({
      success: true,
      connected: cached.connected,
      authorizeUrl,
      expiresAt: cached.expiresAt,
      portalId: cached.portalId,
    });
  }

  // Check connection status from DB — this is the source of truth.
  // Do this BEFORE checking clientId so that existing connections are
  // always recognized even if the client ID is temporarily unavailable.
  const connected = await isConnected(accountId);
  const tokens = await getTokens(accountId);
  const expiresAt = tokens?.expires_at ? String(tokens.expires_at) : null;
  const portalId = connected ? await getPortalId(accountId) : null;

  // Cache the connection status per-account
  cache.set<ConnectionStatus>(connectionCacheKey, {
    connected,
    expiresAt,
    portalId,
  }, CACHE_TTL.CONNECTION);

  // Generate authorize URL only if not connected and client ID is available
  let authorizeUrl: string | null = null;
  if (!connected) {
    const clientId = await getHubSpotClientIdAsync();
    if (!clientId) {
      return NextResponse.json({
        success: false,
        connected: false,
        error: 'HubSpot Client ID not configured. Set HUBSPOT_CLIENT_ID in .env.local or add hubspot_client_id to app_settings table.',
      });
    }
    authorizeUrl = await getAuthorizeUrl(accountId);
  }

  return NextResponse.json({
    success: true,
    connected,
    authorizeUrl,
    expiresAt,
    portalId,
  });
}

// DELETE - disconnect HubSpot (revokes at HubSpot, clears local tokens, removes headings)
export async function DELETE(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || '';

  // Uninstall the app from HubSpot portal, then revoke tokens.
  // The uninstall endpoint requires a valid access token and fully removes the
  // app from the portal (not just token revocation). This allows the user to
  // re-install cleanly via the Connect button without manually uninstalling
  // from HubSpot's installed-apps page first.
  const accessToken = await getValidAccessToken(accountId);
  if (accessToken) {
    try {
      const uninstallResponse = await fetch(
        'https://api.hubapi.com/appinstalls/v3/external-install',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      console.log('HubSpot app uninstall status:', uninstallResponse.status);
    } catch (err) {
      console.error('Failed to uninstall HubSpot app from portal:', err);
    }
  }

  // Also revoke the refresh token as a fallback (in case the uninstall endpoint
  // didn't fully clean up, or if the access token was already expired).
  const tokens = await getTokens(accountId);
  if (tokens?.refresh_token) {
    try {
      await fetch(
        `https://api.hubapi.com/oauth/v1/refresh-tokens/${tokens.refresh_token}`,
        { method: 'DELETE' }
      );
    } catch (err) {
      console.error('Failed to revoke HubSpot refresh token during disconnect:', err);
    }
  }

  await clearTokens(accountId);
  const removedHeadings = await removeAllHubSpotHeadingsAsync(accountId);
  cache.invalidate(CACHE_KEYS.hubspotConnection(accountId));
  cache.invalidate(CACHE_KEYS.hubspotOwners(accountId));
  return NextResponse.json({ success: true, connected: false, removedHeadings });
}
