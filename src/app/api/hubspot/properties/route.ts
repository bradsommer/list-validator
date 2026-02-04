import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubspot';
import * as fs from 'fs';
import * as path from 'path';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const PROPERTIES_CACHE_FILE = path.join(process.cwd(), '.hubspot-properties.json');

type ObjectType = 'contacts' | 'companies' | 'deals';
const OBJECT_TYPES: ObjectType[] = ['contacts', 'companies', 'deals'];

interface CachedProperty {
  field_name: string;
  field_label: string;
  field_type: string;
  group_name: string;
  object_type: ObjectType;
  description: string | null;
  hubspot_type: string;
  options: Array<{ label: string; value: string }> | null;
}

function loadCachedProperties(): CachedProperty[] {
  try {
    if (fs.existsSync(PROPERTIES_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(PROPERTIES_CACHE_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveCachedProperties(properties: CachedProperty[]) {
  try {
    fs.writeFileSync(PROPERTIES_CACHE_FILE, JSON.stringify(properties, null, 2));
  } catch {
    // ignore
  }
}

async function fetchPropertiesForObjectType(
  accessToken: string,
  objectType: ObjectType
): Promise<CachedProperty[]> {
  const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/${objectType}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`HubSpot API error for ${objectType}:`, response.status);
    return [];
  }

  const data = await response.json();
  const properties = data.results || [];

  return properties.map((prop: {
    name: string;
    label: string;
    type: string;
    groupName: string;
    description?: string;
    fieldType: string;
    options?: Array<{ label: string; value: string }>;
  }) => ({
    field_name: prop.name,
    field_label: prop.label,
    field_type: prop.type,
    group_name: prop.groupName,
    object_type: objectType,
    description: prop.description || null,
    hubspot_type: prop.fieldType,
    options: prop.options || null,
  }));
}

// GET - return cached properties (or fetch live if requested)
export async function GET(request: NextRequest) {
  const objectType = request.nextUrl.searchParams.get('objectType') as ObjectType | null;

  // Try cached first
  let cached = loadCachedProperties();

  if (cached.length === 0) {
    // No cache - try fetching live
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'HubSpot not connected. Go to Admin > Integrations to connect.',
        properties: [],
      }, { status: 400 });
    }

    // Fetch all object types
    const allProperties: CachedProperty[] = [];
    for (const type of OBJECT_TYPES) {
      const props = await fetchPropertiesForObjectType(accessToken, type);
      allProperties.push(...props);
    }

    if (allProperties.length > 0) {
      saveCachedProperties(allProperties);
      cached = allProperties;
    }
  }

  // Filter by object type if specified
  const filtered = objectType
    ? cached.filter(p => p.object_type === objectType)
    : cached;

  return NextResponse.json({
    success: true,
    properties: filtered,
    count: filtered.length,
  });
}

// POST - sync/refresh properties from HubSpot
export async function POST() {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'HubSpot not connected. Go to Admin > Integrations to connect.' },
        { status: 400 }
      );
    }

    const allProperties: CachedProperty[] = [];
    const counts: Record<string, number> = {};

    for (const objectType of OBJECT_TYPES) {
      const props = await fetchPropertiesForObjectType(accessToken, objectType);
      allProperties.push(...props);
      counts[objectType] = props.length;
    }

    // Check what was previously cached
    const previousCache = loadCachedProperties();
    const previousCount = previousCache.length;

    // Save to file cache
    saveCachedProperties(allProperties);

    const newCount = allProperties.length - previousCount;

    return NextResponse.json({
      success: true,
      message: `Synced ${allProperties.length} properties (${counts.contacts} contacts, ${counts.companies} companies, ${counts.deals} deals)${previousCount > 0 ? ` — ${newCount > 0 ? newCount + ' new' : 'all up to date'}` : ''}`,
      total: allProperties.length,
      counts,
    });
  } catch (error) {
    console.error('Error syncing HubSpot properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync HubSpot properties' },
      { status: 500 }
    );
  }
}
