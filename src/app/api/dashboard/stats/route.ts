import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;

    // Fetch all sessions for this account
    const { data: sessions, error: sessionsError } = await supabase
      .from('upload_sessions')
      .select('id, total_rows, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true });

    if (sessionsError) {
      console.error('Failed to fetch sessions:', sessionsError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch dashboard stats' },
        { status: 500 }
      );
    }

    // Fetch enabled rule count
    const { count: enabledRuleCount, error: rulesError } = await supabase
      .from('account_rules')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('enabled', true);

    if (rulesError) {
      console.error('Failed to fetch rules:', rulesError.message);
    }

    // Group sessions by month
    const monthlyData: Record<string, { count: number; totalRows: number }> = {};
    for (const session of sessions || []) {
      const date = new Date(session.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { count: 0, totalRows: 0 };
      }
      monthlyData[key].count += 1;
      monthlyData[key].totalRows += session.total_rows || 0;
    }

    // Build last 6 months array (including current month)
    const months: { month: string; label: string; imports: number; rows: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const data = monthlyData[key] || { count: 0, totalRows: 0 };
      months.push({ month: key, label, imports: data.count, rows: data.totalRows });
    }

    const totalImports = (sessions || []).length;
    const rulesPerImport = enabledRuleCount || 0;
    const timeSavedMinutes = totalImports * rulesPerImport * 5;

    return NextResponse.json({
      success: true,
      months,
      totalImports,
      enabledRuleCount: rulesPerImport,
      timeSavedMinutes,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
