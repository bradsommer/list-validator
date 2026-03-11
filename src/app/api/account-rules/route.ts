import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    const enabledOnly = request.nextUrl.searchParams.get('enabledOnly') === 'true';
    const countOnly = request.nextUrl.searchParams.get('countOnly') === 'true';

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const db = getServerSupabase();

    if (countOnly) {
      let query = db
        .from('account_rules')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      if (enabledOnly) query = query.eq('enabled', true);
      const { count, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ count: count || 0 });
    }

    let query = db
      .from('account_rules')
      .select('*')
      .eq('account_id', accountId)
      .order('display_order');

    if (enabledOnly) {
      query = query.eq('enabled', true);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Error fetching account rules:', err);
    return NextResponse.json({ error: 'Failed to fetch account rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getServerSupabase();
    const { data, error } = await db
      .from('account_rules')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error creating account rule:', err);
    return NextResponse.json({ error: 'Failed to create account rule' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accountId, ruleId, ...updates } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('account_rules')
      .update(updates)
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating account rule:', err);
    return NextResponse.json({ error: 'Failed to update account rule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { accountId, ruleId } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('account_rules')
      .delete()
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting account rule:', err);
    return NextResponse.json({ error: 'Failed to delete account rule' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { accountId, ruleId, ...updates } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('account_rules')
      .update(updates)
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error patching account rule:', err);
    return NextResponse.json({ error: 'Failed to update account rule' }, { status: 500 });
  }
}
