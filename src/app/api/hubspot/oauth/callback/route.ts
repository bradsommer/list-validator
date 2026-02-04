import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setTokens, resetClient } from '@/lib/hubspot';
import { supabase } from '@/lib/supabase';

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

    // Store in-memory for immediate use
    setTokens(tokens);
    resetClient();

    // Also persist to account_integrations table if we have an account
    const accountId = state || 'dev-account-id';
    if (accountId) {
      await supabase
        .from('account_integrations')
        .upsert({
          account_id: accountId,
          provider: 'hubspot',
          is_active: true,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expires_at,
          connected_at: new Date().toISOString(),
        }, {
          onConflict: 'account_id,provider',
        });
    }

    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_connected=true`);
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=token_exchange_failed`);
  }
}
