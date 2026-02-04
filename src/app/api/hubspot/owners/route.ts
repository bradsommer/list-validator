import { NextResponse } from 'next/server';
import { getHubSpotOwners } from '@/lib/hubspot';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

export async function GET() {
  try {
    const cached = cache.get<{ id: string; name: string; email: string }[]>(CACHE_KEYS.HUBSPOT_OWNERS);
    if (cached) {
      return NextResponse.json({ owners: cached });
    }

    const owners = await getHubSpotOwners();
    cache.set(CACHE_KEYS.HUBSPOT_OWNERS, owners, CACHE_TTL.OWNERS);
    return NextResponse.json({ owners });
  } catch (error) {
    console.error('Error fetching HubSpot owners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot owners' },
      { status: 500 }
    );
  }
}
