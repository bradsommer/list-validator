import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const db = getServerSupabase();
    const { data, error } = await db
      .from('column_headings')
      .select('id, name, source, hubspot_object_type, hubspot_field_name, created_at')
      .eq('account_id', accountId)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Error fetching column headings:', err);
    return NextResponse.json({ error: 'Failed to fetch column headings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, name } = await request.json();
    const db = getServerSupabase();
    const { data, error } = await db
      .from('column_headings')
      .insert({ account_id: accountId, name: name.trim(), source: 'manual' })
      .select('id, name, source, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error creating column heading:', err);
    return NextResponse.json({ error: 'Failed to create column heading' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, accountId } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('column_headings')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating column heading:', err);
    return NextResponse.json({ error: 'Failed to update column heading' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, accountId, hubspotOnly } = await request.json();
    const db = getServerSupabase();

    if (hubspotOnly) {
      const { data, error } = await db
        .from('column_headings')
        .delete()
        .eq('account_id', accountId)
        .eq('source', 'hubspot')
        .select('id');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, removedCount: data?.length || 0 });
    }

    const { error } = await db
      .from('column_headings')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting column heading:', err);
    return NextResponse.json({ error: 'Failed to delete column heading' }, { status: 500 });
  }
}
