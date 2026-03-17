import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const db = getServerSupabase();
    const { data, error } = await db
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error fetching account:', err);
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accountId, ...updates } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const db = getServerSupabase();
    const { error } = await db
      .from('accounts')
      .update(updates)
      .eq('id', accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating account:', err);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
