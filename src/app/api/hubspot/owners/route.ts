import { NextResponse } from 'next/server';
import { getHubSpotOwners } from '@/lib/hubspot';

export async function GET() {
  try {
    const owners = await getHubSpotOwners();
    return NextResponse.json({ owners });
  } catch (error) {
    console.error('Error fetching HubSpot owners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot owners' },
      { status: 500 }
    );
  }
}
