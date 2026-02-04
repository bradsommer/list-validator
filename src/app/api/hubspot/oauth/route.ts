import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizeUrl, getHubSpotClientIdAsync, isConnected, getTokens, getPortalId, clearTokens } from '@/lib/hubspot';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

interface ConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
  portalId: string | null;
}

// GET - returns connection status or redirect URL
export async function GET(request: NextRequest) {
  const clientId = await getHubSpotClientIdAsync();
  const accountId = request.headers.get('x-account-id') || '00000000-0000-0000-0000-000000000001';

  if (!clientId) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: 'HubSpot Client ID not configured. Set HUBSPOT_CLIENT_ID in .env.local or add hubspot_client_id to app_settings table.',
    });
  }

  // Check cache for connection status
  const cached = cache.get<ConnectionStatus>(CACHE_KEYS.HUBSPOT_CONNECTION);
  if (cached) {
    const authorizeUrl = cached.connected ? null : await getAuthorizeUrl(accountId);
    return NextResponse.json({
      success: true,
      connected: cached.connected,
      authorizeUrl,
      expiresAt: cached.expiresAt,
      portalId: cached.portalId,
    });
  }

  const connected = await isConnected();
  const tokens = await getTokens(accountId);
  const expiresAt = tokens?.expires_at || null;
  const portalId = connected ? await getPortalId(accountId) : null;

  // Cache the connection status
  cache.set<ConnectionStatus>(CACHE_KEYS.HUBSPOT_CONNECTION, {
    connected,
    expiresAt,
    portalId,
  }, CACHE_TTL.CONNECTION);

  const authorizeUrl = connected ? null : await getAuthorizeUrl(accountId);

  return NextResponse.json({
    success: true,
    connected,
    authorizeUrl,
    expiresAt,
    portalId,
  });
}

// DELETE - disconnect HubSpot (invalidates cache)
export async function DELETE(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || '00000000-0000-0000-0000-000000000001';
  await clearTokens(accountId);
  cache.invalidate(CACHE_KEYS.HUBSPOT_CONNECTION);
  cache.invalidate(CACHE_KEYS.HUBSPOT_OWNERS);
  return NextResponse.json({ success: true, connected: false });
}
