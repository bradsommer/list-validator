import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotOwners } from '@/lib/hubspot';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const accountId = request.headers.get('x-account-id') || '';
  try {
    const cacheKey = CACHE_KEYS.hubspotOwners(accountId);
    const cached = cache.get<{ id: string; name: string; email: string }[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ owners: cached });
    }

    const owners = await getHubSpotOwners();
    cache.set(cacheKey, owners, CACHE_TTL.OWNERS);
    return NextResponse.json({ owners });
  } catch (error) {
    console.error('Error fetching HubSpot owners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HubSpot owners' },
      { status: 500 }
    );
  }
}
