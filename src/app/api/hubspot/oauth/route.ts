import { NextResponse } from 'next/server';
import { getAuthorizeUrl, getHubSpotClientId, isConnected, getTokens, clearTokens } from '@/lib/hubspot';

// GET - returns connection status or redirect URL
export async function GET() {
  const clientId = getHubSpotClientId();

  if (!clientId) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: 'HubSpot Client ID not configured. Set HUBSPOT_CLIENT_ID in .env.local',
    });
  }

  const connected = isConnected();
  const tokens = getTokens();

  return NextResponse.json({
    success: true,
    connected,
    authorizeUrl: connected ? null : getAuthorizeUrl(),
    expiresAt: tokens?.expires_at || null,
  });
}

// DELETE - disconnect HubSpot
export async function DELETE() {
  clearTokens();
  return NextResponse.json({ success: true, connected: false });
}
