import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubspot';
import { supabase } from '@/lib/supabase';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

type ObjectType = 'contacts' | 'companies' | 'deals';
const OBJECT_TYPES: ObjectType[] = ['contacts', 'companies', 'deals'];

interface HubSpotProperty {
  field_name: string;
  field_label: string;
  field_type: string;
  group_name: string;
  object_type: string;
  description: string | null;
  hubspot_type: string;
  options: Array<{ label: string; value: string }> | null;
}

async function fetchPropertiesFromHubSpot(
  accessToken: string,
  objectType: ObjectType
): Promise<HubSpotProperty[]> {
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

async function savePropertiesToDB(accountId: string, properties: HubSpotProperty[]): Promise<void> {
  // Delete existing properties for this account, then insert fresh
  await supabase
    .from('hubspot_properties')
    .delete()
    .eq('account_id', accountId);

  // Insert in batches of 500
  for (let i = 0; i < properties.length; i += 500) {
    const batch = properties.slice(i, i + 500).map((p) => ({
      account_id: accountId,
      field_name: p.field_name,
      field_label: p.field_label,
      field_type: p.field_type,
      group_name: p.group_name,
      object_type: p.object_type,
      description: p.description,
      hubspot_type: p.hubspot_type,
      options: p.options,
    }));

    const { error } = await supabase
      .from('hubspot_properties')
      .insert(batch);

    if (error) {
      console.error(`Failed to insert properties batch ${i}:`, error.message);
    }
  }
}

// Exported for use by OAuth callback
export async function fetchAndStoreProperties(accountId: string): Promise<{
  total: number;
  counts: Record<string, number>;
}> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('HubSpot not connected');
  }

  const allProperties: HubSpotProperty[] = [];
  const counts: Record<string, number> = {};

  for (const objectType of OBJECT_TYPES) {
    const props = await fetchPropertiesFromHubSpot(accessToken, objectType);
    allProperties.push(...props);
    counts[objectType] = props.length;
  }

  if (allProperties.length > 0) {
    await savePropertiesToDB(accountId, allProperties);
  }

  return { total: allProperties.length, counts };
}

// GET - return properties from DB
export async function GET(request: NextRequest) {
  const objectType = request.nextUrl.searchParams.get('objectType') as ObjectType | null;
  const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;

  let query = supabase
    .from('hubspot_properties')
    .select('field_name, field_label, field_type, group_name, object_type, description, hubspot_type, options')
    .eq('account_id', accountId)
    .order('field_label');

  if (objectType) {
    query = query.eq('object_type', objectType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load properties from DB:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to load properties',
      properties: [],
    }, { status: 500 });
  }

  // If no properties in DB, try fetching from HubSpot
  if (!data || data.length === 0) {
    try {
      const result = await fetchAndStoreProperties(accountId);
      // Re-query after storing
      let retryQuery = supabase
        .from('hubspot_properties')
        .select('field_name, field_label, field_type, group_name, object_type, description, hubspot_type, options')
        .eq('account_id', accountId)
        .order('field_label');

      if (objectType) {
        retryQuery = retryQuery.eq('object_type', objectType);
      }

      const { data: freshData } = await retryQuery;

      return NextResponse.json({
        success: true,
        properties: freshData || [],
        count: freshData?.length || 0,
        synced: true,
        total: result.total,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'HubSpot not connected. Go to Admin > Integrations to connect.',
        properties: [],
      }, { status: 400 });
    }
  }

  return NextResponse.json({
    success: true,
    properties: data,
    count: data.length,
  });
}

// POST - manually sync/refresh properties from HubSpot
export async function POST(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;

    // Get existing count for comparison
    const { count: previousCount } = await supabase
      .from('hubspot_properties')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId);

    const result = await fetchAndStoreProperties(accountId);

    const newCount = result.total - (previousCount || 0);

    return NextResponse.json({
      success: true,
      message: `Synced ${result.total} properties (${result.counts.contacts} contacts, ${result.counts.companies} companies, ${result.counts.deals} deals)${previousCount ? ` — ${newCount > 0 ? newCount + ' new' : 'all up to date'}` : ''}`,
      total: result.total,
      counts: result.counts,
    });
  } catch (error) {
    console.error('Error syncing HubSpot properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync HubSpot properties' },
      { status: 500 }
    );
  }
}
