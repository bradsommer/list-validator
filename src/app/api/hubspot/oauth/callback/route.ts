import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setTokens, resetClient } from '@/lib/hubspot';

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
    const accountId = state || 'dev-account-id';

    // Fetch the portal ID (hub_id) from HubSpot token info
    let portalId: string | undefined;
    try {
      const tokenInfoResponse = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`
      );
      if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json();
        portalId = tokenInfo.hub_id?.toString();
      }
    } catch {
      // Non-critical - continue without portal ID
    }

    // Store tokens to in-memory, file, and database
    await setTokens(tokens, accountId, portalId);
    resetClient();

    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_connected=true`);
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=token_exchange_failed`);
  }
}
