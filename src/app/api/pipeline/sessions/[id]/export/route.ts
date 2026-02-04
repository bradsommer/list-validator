import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

// GET - Export session rows as CSV
// Query params:
//   filter: 'all' | 'clean' | 'flagged'
//     all = every row
//     clean = rows without errors (status != 'failed')
//     flagged = rows with errors (status = 'failed')
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const filter = request.nextUrl.searchParams.get('filter') || 'all';

    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('file_name, status, expires_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Build row query
    let query = supabase
      .from('upload_rows')
      .select('row_index, raw_data, enriched_data, status, error_message')
      .eq('session_id', sessionId)
      .order('row_index');

    if (filter === 'clean') {
      query = query.neq('status', 'failed');
    } else if (filter === 'flagged') {
      query = query.eq('status', 'failed');
    }

    const { data: rows, error: rowsError } = await query;

    if (rowsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rows' },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rows found for this filter' },
        { status: 404 }
      );
    }

    // Merge raw_data + enriched_data for each row
    const exportRows = rows.map((row) => {
      const merged = {
        ...(row.raw_data as Record<string, unknown>),
        ...(row.enriched_data as Record<string, unknown>),
      };

      // For flagged export, include the error
      if (filter === 'flagged' && row.error_message) {
        merged['_error'] = row.error_message;
      }

      return merged;
    });

    // Generate CSV
    const csv = Papa.unparse(exportRows);

    // Build filename
    const baseName = (session.file_name || 'export').replace(/\.[^/.]+$/, '');
    const suffix = filter === 'clean' ? '_clean' : filter === 'flagged' ? '_flagged' : '';
    const fileName = `${baseName}${suffix}_export.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    );
  }
}
