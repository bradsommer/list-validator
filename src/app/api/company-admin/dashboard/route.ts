import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const startDate = request.nextUrl.searchParams.get('startDate');
    const db = getServerSupabase();

    const [accountsResult, usersResult, rulesResult] = await Promise.all([
      db.from('accounts').select('id, name, slug').order('name'),
      db.from('users').select('id, account_id'),
      db.from('account_rules').select('account_id, enabled'),
    ]);

    let sessionsQuery = db
      .from('upload_sessions')
      .select('id, account_id, total_rows, created_at');
    if (startDate) {
      sessionsQuery = sessionsQuery.gte('created_at', startDate);
    }
    const sessionsResult = await sessionsQuery;

    return NextResponse.json({
      accounts: accountsResult.data || [],
      users: usersResult.data || [],
      sessions: sessionsResult.data || [],
      rules: rulesResult.data || [],
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
