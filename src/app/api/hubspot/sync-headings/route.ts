import { NextRequest, NextResponse } from 'next/server';
import { syncHubSpotPropertiesAsHeadings } from '@/lib/columnHeadings';
import { fetchAndStoreProperties } from '@/app/api/hubspot/properties/route';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// POST - sync HubSpot properties into column_headings
export async function POST(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;

    // First refresh HubSpot properties from the API
    await fetchAndStoreProperties(accountId);

    // Then sync those properties into column_headings
    const result = await syncHubSpotPropertiesAsHeadings(accountId);

    return NextResponse.json({
      success: true,
      message: `Synced ${result.total} HubSpot properties as column headings (${result.added} added, ${result.updated} updated, ${result.removed} removed).`,
      ...result,
    });
  } catch (error) {
    console.error('Error syncing HubSpot headings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync HubSpot properties as column headings.' },
      { status: 500 }
    );
  }
}
