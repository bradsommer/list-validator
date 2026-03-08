import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/hubspot';
import { getServerSupabase } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

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
  if (!accountId || accountId.length === 0) {
    throw new Error('Cannot save properties: account ID is required');
  }

  const db = getServerSupabase();

  // Delete existing properties for this account, then insert fresh
  const { error: deleteError } = await db
    .from('hubspot_properties')
    .delete()
    .eq('account_id', accountId);

  if (deleteError) {
    console.error('Failed to delete existing properties:', deleteError.message);
    throw new Error(`Failed to clear existing HubSpot properties: ${deleteError.message}`);
  }

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

    const { error } = await db
      .from('hubspot_properties')
      .insert(batch);

    if (error) {
      console.error(`Failed to insert properties batch ${i}:`, error.message);
      throw new Error(`Failed to save HubSpot properties to database: ${error.message}`);
    }
  }
}

async function resolveAccountId(request: NextRequest): Promise<string | null> {
  const fromHeader = request.headers.get('x-account-id');
  if (fromHeader && fromHeader.length > 0) return fromHeader;
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  const user = await validateSession(token);
  return user?.accountId || null;
}

// Exported for use by OAuth callback
export async function fetchAndStoreProperties(accountId: string): Promise<{
  total: number;
  counts: Record<string, number>;
}> {
  const accessToken = await getValidAccessToken(accountId);
  if (!accessToken) {
    // Check if the table is reachable and give a more specific error
    try {
      const db = getServerSupabase();
      const { data, error } = await db
        .from('account_integrations')
        .select('id, is_active')
        .eq('account_id', accountId)
        .eq('provider', 'hubspot')
        .maybeSingle();
      if (error) {
        console.error('[HubSpot Re-Sync] DB query failed:', error.message, '(code:', error.code, ')');
        throw new Error('HubSpot token lookup failed — database error: ' + error.message);
      }
      if (!data) {
        console.error('[HubSpot Re-Sync] No integration row found for account', accountId);
        throw new Error('HubSpot not connected — no integration record found. Please reconnect via Admin > Integrations.');
      }
      if (!data.is_active) {
        console.error('[HubSpot Re-Sync] Integration row exists but is_active=false for account', accountId);
        throw new Error('HubSpot integration is inactive. Please reconnect via Admin > Integrations.');
      }
      // Row exists and is active, but token retrieval still failed (expired + refresh failed)
      throw new Error('HubSpot token expired and could not be refreshed. Please reconnect via Admin > Integrations.');
    } catch (diagErr) {
      if (diagErr instanceof Error && diagErr.message.startsWith('HubSpot')) throw diagErr;
      throw new Error('HubSpot not connected');
    }
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
  const accountId = await resolveAccountId(request);
  if (!accountId) {
    return NextResponse.json({ success: false, error: 'Account ID required', properties: [] }, { status: 400 });
  }

  const db = getServerSupabase();

  let query = db
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
      let retryQuery = db
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
    const accountId = await resolveAccountId(request);
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
    }

    // Get existing count for comparison
    const db = getServerSupabase();
    const { count: previousCount } = await db
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error syncing HubSpot properties:', message);
    return NextResponse.json(
      { success: false, error: `Failed to sync HubSpot properties: ${message}` },
      { status: 500 }
    );
  }
}
