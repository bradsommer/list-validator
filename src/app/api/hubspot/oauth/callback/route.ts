import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setTokens, resetClient, getAuthorizeUrl } from '@/lib/hubspot';
import { cache, CACHE_KEYS } from '@/lib/cache';
import { fetchAndStoreProperties } from '@/app/api/hubspot/properties/route';
import { syncHubSpotPropertiesAsHeadings } from '@/lib/columnHeadings';

// Returns a small HTML page that posts a message to the opener window and closes itself.
// This supports both popup-based OAuth (sends postMessage + closes) and direct navigation
// (falls back to redirect if there is no opener).
function oauthResultPage(result: { success: boolean; error?: string }) {
  const payload = JSON.stringify(result);
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>Connecting...</title></head><body>
<script>
  if (window.opener) {
    window.opener.postMessage(${JSON.stringify(payload)}, window.location.origin);
    window.close();
  } else {
    window.location.href = ${JSON.stringify(
      result.success
        ? '/admin/integrations?hubspot_connected=true'
        : '/admin/integrations?hubspot_error=' + encodeURIComponent(result.error || 'unknown')
    )};
  }
</script>
<noscript><a href="/admin/integrations">Return to integrations</a></noscript>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const state = request.nextUrl.searchParams.get('state'); // account_id passed as state

  if (error) {
    console.error('HubSpot OAuth error:', error);
    return oauthResultPage({ success: false, error });
  }

  if (!code) {
    return oauthResultPage({ success: false, error: 'no_code' });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const accountId = state || '';

    // Fetch the portal ID (hub_id) and verify scopes from HubSpot token info
    let portalId: string | undefined;
    try {
      const tokenInfoResponse = await fetch(
        `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`
      );
      if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json();
        portalId = tokenInfo.hub_id?.toString();
        console.log('HubSpot portal ID fetched:', portalId);

        // Verify that required CRM scopes were granted.
        // For unapproved HubSpot apps the consent flow has two screens;
        // if the user only completes the first one, the token is issued
        // without CRM scopes. Reject early so the user knows to re-try.
        const requiredScopes = [
          'crm.schemas.contacts.read',
          'crm.schemas.companies.read',
          'crm.schemas.deals.read',
        ];
        const grantedScopes: string[] = tokenInfo.scopes || [];
        const missingScopes = requiredScopes.filter(s => !grantedScopes.includes(s));
        if (missingScopes.length > 0) {
          console.error('HubSpot OAuth missing scopes:', missingScopes, 'granted:', grantedScopes);
          // Scopes are missing — the user only completed the first consent
          // screen (unapproved-app flow has two screens). Revoke the partial
          // token so HubSpot clears the cached grant, then return an error to
          // the popup. The user can click "Connect" again to retry cleanly.
          // (Previously this redirected back to authorize, but that created a
          // loop that could close the popup and falsely show "connected".)
          if (tokens.refresh_token) {
            try {
              await fetch(
                `https://api.hubapi.com/oauth/v1/refresh-tokens/${tokens.refresh_token}`,
                { method: 'DELETE' }
              );
            } catch (revokeErr) {
              console.error('Failed to revoke partial HubSpot token:', revokeErr);
            }
          }
          return oauthResultPage({
            success: false,
            error: 'Please approve both authorization screens when connecting. Click "Connect HubSpot" to try again.',
          });
        }
      } else {
        console.error('Failed to fetch HubSpot token info:', tokenInfoResponse.status);
      }
    } catch (err) {
      console.error('Error fetching HubSpot token info:', err);
    }

    // Store tokens to in-memory, file, and database
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

    return oauthResultPage({ success: true });
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return oauthResultPage({ success: false, error: 'token_exchange_failed' });
  }
}
