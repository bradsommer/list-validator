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
      .from('column_mapping_history')
      .select('spreadsheet_header, hubspot_heading')
      .eq('account_id', accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const history: Record<string, string> = {};
    for (const row of data || []) {
      history[row.spreadsheet_header] = row.hubspot_heading;
    }
    return NextResponse.json({ data: history });
  } catch (err) {
    console.error('Error fetching mapping history:', err);
    return NextResponse.json({ error: 'Failed to fetch mapping history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, mapping } = await request.json();
    const db = getServerSupabase();

    const rows = Object.entries(mapping).map(([header, heading]) => ({
      account_id: accountId,
      spreadsheet_header: header,
      hubspot_heading: heading as string,
    }));

    if (rows.length > 0) {
      const { error } = await db
        .from('column_mapping_history')
        .upsert(rows, { onConflict: 'account_id,spreadsheet_header' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving mapping history:', err);
    return NextResponse.json({ error: 'Failed to save mapping history' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accountId, header, value } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('column_mapping_history')
      .upsert(
        { account_id: accountId, spreadsheet_header: header, hubspot_heading: value },
        { onConflict: 'account_id,spreadsheet_header' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating mapping history entry:', err);
    return NextResponse.json({ error: 'Failed to update mapping history' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { accountId, header, clearAll } = await request.json();
    const db = getServerSupabase();

    if (clearAll) {
      const { error } = await db
        .from('column_mapping_history')
        .delete()
        .eq('account_id', accountId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const { error } = await db
      .from('column_mapping_history')
      .delete()
      .eq('account_id', accountId)
      .eq('spreadsheet_header', header);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting mapping history:', err);
    return NextResponse.json({ error: 'Failed to delete mapping history' }, { status: 500 });
  }
}
