import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setTokens, resetClient } from '@/lib/hubspot';
import { cache, CACHE_KEYS } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state'); // account_id passed as state

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectPage = '/admin/integrations';

  if (error) {
    console.error('HubSpot OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const accountId = state || '00000000-0000-0000-0000-000000000001';

    // Fetch the portal ID (hub_id) from HubSpot token info
    let portalId: string | undefined;
    try {
      const tokenInfoResponse = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`
      );
      if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json();
        portalId = tokenInfo.hub_id?.toString();
        console.log('HubSpot portal ID fetched:', portalId);
      } else {
        console.error('Failed to fetch HubSpot token info:', tokenInfoResponse.status);
      }
    } catch (err) {
      console.error('Error fetching HubSpot token info:', err);
    }

    // Store tokens to in-memory, file, and database
    await setTokens(tokens, accountId, portalId);
    resetClient();

    // Invalidate cached connection status so next check reflects new connection
    cache.invalidate(CACHE_KEYS.HUBSPOT_CONNECTION);

    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_connected=true`);
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=token_exchange_failed`);
  }
}
