import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// POST - Record a completed import
export async function POST(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;
    const { fileName, totalRows, rulesApplied } = await request.json();

    const { error } = await supabase.from('import_history').insert({
      account_id: accountId,
      file_name: fileName || 'unknown',
      total_rows: totalRows || 0,
      rules_applied: rulesApplied || 0,
    });

    if (error) {
      console.error('Failed to log import:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to log import' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Import history error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
