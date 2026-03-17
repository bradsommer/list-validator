import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getServerSupabase();
    const [accountsResult, usersResult] = await Promise.all([
      db.from('accounts').select('*').order('name'),
      db.from('users').select('id, username, first_name, last_name, role, is_active, last_login, account_id').order('created_at', { ascending: false }),
    ]);

    if (accountsResult.error) {
      return NextResponse.json({ error: accountsResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      accounts: accountsResult.data || [],
      users: usersResult.data || [],
    });
  } catch (err) {
    console.error('Error fetching company admin accounts:', err);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
