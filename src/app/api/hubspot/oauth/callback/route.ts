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

    // Store tokens to in-memory, file, and database
    await setTokens(tokens, accountId);
    resetClient();

    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_connected=true`);
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}${redirectPage}?hubspot_error=token_exchange_failed`);
  }
}
