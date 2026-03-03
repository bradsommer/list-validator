import { NextRequest, NextResponse } from 'next/server';
import { syncHubSpotPropertiesAsHeadings } from '@/lib/columnHeadings';
import { fetchAndStoreProperties } from '@/app/api/hubspot/properties/route';
import { getServerSupabase } from '@/lib/supabase';

// POST - sync HubSpot properties into column_headings
export async function POST(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || '';

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
