import { NextRequest, NextResponse } from 'next/server';
import { syncHubSpotPropertiesAsHeadings } from '@/lib/columnHeadings';
import { fetchAndStoreProperties } from '@/app/api/hubspot/properties/route';
import { getServerSupabase } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - sync HubSpot properties into column_headings
export async function POST(request: NextRequest) {
  try {
    const fromHeader = request.headers.get('x-account-id');
    let accountId = fromHeader && fromHeader.length > 0 ? fromHeader : null;
    if (!accountId) {
      const token = request.cookies.get('session_token')?.value;
      if (token) {
        const user = await validateSession(token);
        accountId = user?.accountId || null;
      }
    }
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
    }

    // First refresh HubSpot properties from the API
    await fetchAndStoreProperties(accountId);

    // Then sync those properties into column_headings (using service role to bypass RLS)
    const serverDb = getServerSupabase();
    const result = await syncHubSpotPropertiesAsHeadings(accountId, serverDb);

    return NextResponse.json({
      success: true,
      message: `Synced ${result.total} HubSpot properties as column headings (${result.added} added, ${result.updated} updated, ${result.removed} removed).`,
      ...result,
    });
  } catch (error) {
    console.error('Error syncing HubSpot headings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to sync HubSpot properties as column headings: ${message}` },
      { status: 500 }
    );
  }
}
