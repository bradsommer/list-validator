import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// GET - List upload sessions for the account
export async function GET(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;
    const statusFilter = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('upload_sessions')
      .select('id, file_name, status, total_rows, processed_rows, enriched_rows, synced_rows, failed_rows, error_message, retry_count, max_retries, expires_at, completed_at, created_at, updated_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch sessions:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessions: (data || []).map((s: Record<string, unknown>) => ({
        id: s.id,
        fileName: s.file_name,
        status: s.status,
        totalRows: s.total_rows,
        processedRows: s.processed_rows,
        enrichedRows: s.enriched_rows,
        syncedRows: s.synced_rows,
        failedRows: s.failed_rows,
        errorMessage: s.error_message,
        retryCount: s.retry_count,
        maxRetries: s.max_retries,
        expiresAt: s.expires_at,
        completedAt: s.completed_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error) {
    console.error('Pipeline sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
