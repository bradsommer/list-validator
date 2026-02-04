import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get session detail including failed row errors
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get summary of row statuses
    const { data: statusCounts } = await supabase
      .from('upload_rows')
      .select('status')
      .eq('session_id', sessionId);

    const counts: Record<string, number> = {};
    if (statusCounts) {
      for (const row of statusCounts) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
    }

    // Get failed rows with their errors (limited to first 100)
    const { data: failedRows } = await supabase
      .from('upload_rows')
      .select('row_index, error_message, status')
      .eq('session_id', sessionId)
      .eq('status', 'failed')
      .order('row_index')
      .limit(100);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        fileName: session.file_name,
        status: session.status,
        totalRows: session.total_rows,
        processedRows: session.processed_rows,
        enrichedRows: session.enriched_rows,
        syncedRows: session.synced_rows,
        failedRows: session.failed_rows,
        errorMessage: session.error_message,
        retryCount: session.retry_count,
        maxRetries: session.max_retries,
        expiresAt: session.expires_at,
        completedAt: session.completed_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      rowStatusCounts: counts,
      failedRowDetails: (failedRows || []).map((r: Record<string, unknown>) => ({
        rowIndex: r.row_index,
        error: r.error_message,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error('Pipeline session detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session details' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/delete a session and its rows
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Delete rows first (cascade should handle this, but be explicit)
    await supabase
      .from('upload_rows')
      .delete()
      .eq('session_id', sessionId);

    // Delete the session
    const { error } = await supabase
      .from('upload_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pipeline session delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
