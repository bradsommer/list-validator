import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizeUrl, getHubSpotClientId, isConnected, getTokens, getPortalId, clearTokens } from '@/lib/hubspot';

// GET - returns connection status or redirect URL
export async function GET(request: NextRequest) {
  const clientId = getHubSpotClientId();
  const accountId = request.headers.get('x-account-id') || 'dev-account-id';

  if (!clientId) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: 'HubSpot Client ID not configured. Set HUBSPOT_CLIENT_ID in .env.local',
    });
  }

  const connected = await isConnected();
  const tokens = await getTokens(accountId);
  const expiresAt = tokens?.expires_at || null;
  const portalId = connected ? await getPortalId(accountId) : null;

  const authorizeUrl = connected ? null : getAuthorizeUrl(accountId);

  return NextResponse.json({
    success: true,
    connected,
    authorizeUrl,
    expiresAt,
    portalId,
  });
}

// DELETE - disconnect HubSpot
export async function DELETE(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || 'dev-account-id';
  await clearTokens(accountId);
  return NextResponse.json({ success: true, connected: false });
}
