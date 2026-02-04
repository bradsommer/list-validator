import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getValidAccessToken } from '@/lib/hubspot';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'HubSpot not connected. Go to Admin > Field Mappings and click "Connect to HubSpot".' },
        { status: 400 }
      );
    }

    // Fetch contact properties from HubSpot
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('HubSpot API error:', errorData);
      return NextResponse.json(
        { success: false, error: `HubSpot API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const properties = data.results || [];

    // Transform to our format
    const formattedProperties = properties.map((prop: {
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
      description: prop.description || null,
      hubspot_type: prop.fieldType,
      options: prop.options || null,
    }));

    return NextResponse.json({
      success: true,
      properties: formattedProperties,
      count: formattedProperties.length,
    });
  } catch (error) {
    console.error('Error fetching HubSpot properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch HubSpot properties' },
      { status: 500 }
    );
  }
}

// POST endpoint to sync HubSpot properties to our database
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'HubSpot not connected. Go to Admin > Field Mappings and click "Connect to HubSpot".' },
        { status: 400 }
      );
    }

    // Fetch contact properties from HubSpot
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `HubSpot API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const properties = data.results || [];

    // Upsert properties into our database
    let inserted = 0;
    let updated = 0;

    for (const prop of properties) {
      const { data: existing } = await supabase
        .from('hubspot_fields')
        .select('id')
        .eq('field_name', prop.name)
        .single();

      if (existing) {
        await supabase
          .from('hubspot_fields')
          .update({
            field_label: prop.label,
            field_type: prop.type,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        updated++;
      } else {
        await supabase
          .from('hubspot_fields')
          .insert({
            field_name: prop.name,
            field_label: prop.label,
            field_type: prop.type,
            is_required: false,
            is_custom: prop.groupName !== 'contactinformation',
          });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${properties.length} properties (${inserted} new, ${updated} updated)`,
      total: properties.length,
      inserted,
      updated,
    });
  } catch (error) {
    console.error('Error syncing HubSpot properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync HubSpot properties' },
      { status: 500 }
    );
  }
}
