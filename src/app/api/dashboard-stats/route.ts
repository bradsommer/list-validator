import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const db = getServerSupabase();
    const { count, error } = await db
      .from('account_rules')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('enabled', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ enabledRulesCount: count || 0 });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
