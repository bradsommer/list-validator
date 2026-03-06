import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setTokens, resetClient } from '@/lib/hubspot';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { fetchAndStoreProperties } from '@/app/api/hubspot/properties/route';
import { syncHubSpotPropertiesAsHeadings } from '@/lib/columnHeadings';

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
    const accountId = state || '';

    // Fetch the portal ID and verify granted scopes from HubSpot token info
    let portalId: string | undefined;
    const requiredScopes = ['crm.schemas.contacts.read', 'crm.schemas.companies.read', 'crm.schemas.deals.read'];
    try {
      const tokenInfoResponse = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`
      );
      if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json();
        portalId = tokenInfo.hub_id?.toString();
        console.log('HubSpot portal ID fetched:', portalId);

        // Verify that the required scopes were actually granted
        const grantedScopes: string[] = tokenInfo.scopes || [];
        const missingScopes = requiredScopes.filter(s => !grantedScopes.includes(s));
        if (missingScopes.length > 0) {
          console.error('HubSpot OAuth incomplete: missing scopes:', missingScopes, 'granted:', grantedScopes);
          return NextResponse.redirect(
            `${baseUrl}${redirectPage}?hubspot_error=${encodeURIComponent(
              'Authorization incomplete. Please re-connect and approve all requested permissions on the second screen.'
            )}`
          );
        }
      } else {
        console.error('Failed to fetch HubSpot token info:', tokenInfoResponse.status);
        return NextResponse.redirect(
          `${baseUrl}${redirectPage}?hubspot_error=${encodeURIComponent('Failed to verify token. Please try again.')}`
        );
      }
    } catch (err) {
      console.error('Error fetching HubSpot token info:', err);
      return NextResponse.redirect(
        `${baseUrl}${redirectPage}?hubspot_error=${encodeURIComponent('Failed to verify token. Please try again.')}`
      );
    }

    // Store tokens to in-memory, file, and database (only reached if scopes are verified)
    await setTokens(tokens, accountId, portalId);
    resetClient();

    // Invalidate cached connection status
    cache.invalidate(CACHE_KEYS.HUBSPOT_CONNECTION);

    // Auto-fetch HubSpot properties and sync as column headings
    try {
      const result = await fetchAndStoreProperties(accountId);
      console.log(`Auto-fetched ${result.total} HubSpot properties on connect`);

      // Also sync properties as column headings
      const headingsResult = await syncHubSpotPropertiesAsHeadings(accountId);
      console.log(`Auto-synced ${headingsResult.added} HubSpot properties as column headings`);
    } catch (err) {
      console.error('Failed to auto-fetch properties on connect:', err);
      // Non-blocking — user can still manually sync later
    }

    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_connected=true`);
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=token_exchange_failed`);
  }
}
