import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizeUrl, getHubSpotClientId, isConnected, getTokens, clearTokens } from '@/lib/hubspot';
import { supabase } from '@/lib/supabase';

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

  // Check DB for persisted integration first
  let connected = isConnected();
  let expiresAt = getTokens()?.expires_at || null;

  if (!connected && accountId) {
    const { data } = await supabase
      .from('account_integrations')
      .select('*')
      .eq('account_id', accountId)
      .eq('provider', 'hubspot')
      .eq('is_active', true)
      .single();

    if (data?.access_token) {
      connected = true;
      expiresAt = data.token_expires_at;
    }
  }

  // Pass account_id as state param so callback knows which account
  const authorizeUrl = connected ? null : getAuthorizeUrl(accountId);

  return NextResponse.json({
    success: true,
    connected,
    authorizeUrl,
    expiresAt,
  });
}

// DELETE - disconnect HubSpot
export async function DELETE(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || 'dev-account-id';

  clearTokens();

  // Also remove from DB
  if (accountId) {
    await supabase
      .from('account_integrations')
      .delete()
      .eq('account_id', accountId)
      .eq('provider', 'hubspot');
  }

  return NextResponse.json({ success: true, connected: false });
}
