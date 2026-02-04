import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
const PAGE_SIZE = 50;

// GET - List CRM records with search, filter, pagination
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const objectType = params.get('objectType') || 'contacts';
  const page = parseInt(params.get('page') || '1', 10);
  const search = params.get('search') || '';
  const sortField = params.get('sortField') || 'updated_at';
  const sortDir = params.get('sortDir') === 'asc' ? true : false;

  try {
    let query = supabase
      .from('crm_records')
      .select('*', { count: 'exact' })
      .eq('account_id', DEFAULT_ACCOUNT_ID)
      .eq('object_type', objectType)
      .gt('expires_at', new Date().toISOString())
      .order(sortField, { ascending: sortDir })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    // Search in JSONB properties
    if (search) {
      // Use textSearch on common fields based on object type
      if (objectType === 'contacts') {
        query = query.or(
          `dedup_key.ilike.%${search}%,properties->>firstname.ilike.%${search}%,properties->>lastname.ilike.%${search}%,properties->>company.ilike.%${search}%`
        );
      } else if (objectType === 'companies') {
        query = query.or(
          `dedup_key.ilike.%${search}%,properties->>name.ilike.%${search}%,properties->>domain.ilike.%${search}%`
        );
      } else {
        query = query.or(
          `dedup_key.ilike.%${search}%,properties->>dealname.ilike.%${search}%`
        );
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('CRM records query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      records: data || [],
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil((count || 0) / PAGE_SIZE),
    });
  } catch (err) {
    console.error('CRM records error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch records' }, { status: 500 });
  }
}

// POST - Create or upsert a CRM record (with dedup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { objectType, properties, hubspotRecordId, uploadSessionId } = body as {
      objectType: string;
      properties: Record<string, unknown>;
      hubspotRecordId?: string;
      uploadSessionId?: string;
    };

    if (!objectType || !properties) {
      return NextResponse.json(
        { success: false, error: 'objectType and properties are required' },
        { status: 400 }
      );
    }

    // Determine dedup key based on object type
    let dedupKey: string | null = null;
    if (objectType === 'contacts') {
      dedupKey = (properties.email as string)?.toLowerCase().trim() || null;
    } else if (objectType === 'companies') {
      dedupKey = (properties.domain as string)?.toLowerCase().trim() ||
                 (properties.name as string)?.toLowerCase().trim() || null;
    } else if (objectType === 'deals') {
      dedupKey = (properties.dealname as string)?.toLowerCase().trim() || null;
    }

    const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    // Check for existing record by dedup key
    if (dedupKey) {
      const { data: existing } = await supabase
        .from('crm_records')
        .select('id, properties')
        .eq('account_id', DEFAULT_ACCOUNT_ID)
        .eq('object_type', objectType)
        .eq('dedup_key', dedupKey)
        .single();

      if (existing) {
        // Merge properties (new values overwrite old, but keep old values not in new)
        const mergedProps = { ...existing.properties, ...properties };
        const updateData: Record<string, unknown> = {
          properties: mergedProps,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        };
        if (hubspotRecordId) updateData.hubspot_record_id = hubspotRecordId;
        if (uploadSessionId) updateData.upload_session_id = uploadSessionId;

        const { data: updated, error } = await supabase
          .from('crm_records')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, record: updated, action: 'updated' });
      }
    }

    // Create new record
    const { data: created, error } = await supabase
      .from('crm_records')
      .insert({
        account_id: DEFAULT_ACCOUNT_ID,
        object_type: objectType,
        properties,
        dedup_key: dedupKey,
        hubspot_record_id: hubspotRecordId || null,
        upload_session_id: uploadSessionId || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, record: created, action: 'created' });
  } catch (err) {
    console.error('CRM record create error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create record' }, { status: 500 });
  }
}

// DELETE - Bulk delete expired records (cleanup endpoint)
export async function DELETE() {
  try {
    const { count, error } = await supabase
      .from('crm_records')
      .delete({ count: 'exact' })
      .eq('account_id', DEFAULT_ACCOUNT_ID)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, deleted: count || 0 });
  } catch (err) {
    console.error('CRM cleanup error:', err);
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
