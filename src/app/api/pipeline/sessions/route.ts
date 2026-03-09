import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// POST - Save a completed import session to history (server-side to bypass RLS)
export async function POST(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      fileName,
      totalRows,
      fieldMappings,
      fileContent,
      fileType,
      fileSize,
      userId,
      enabledRuleCount,
    } = body as {
      fileName: string;
      totalRows: number;
      fieldMappings: Record<string, string>;
      fileContent?: string;
      fileType?: string;
      fileSize?: number;
      userId?: string;
      enabledRuleCount?: number;
    };

    if (!fileName || !totalRows) {
      return NextResponse.json(
        { success: false, error: 'fileName and totalRows are required' },
        { status: 400 }
      );
    }

    const db = getServerSupabase();

    const sessionRecord: Record<string, unknown> = {
      account_id: accountId,
      user_id: userId || null,
      file_name: fileName,
      status: 'completed',
      total_rows: totalRows,
      processed_rows: totalRows,
      synced_rows: totalRows,
      failed_rows: 0,
      field_mappings: fieldMappings || {},
      completed_at: new Date().toISOString(),
      enabled_rule_count: enabledRuleCount ?? null,
    };

    if (fileContent) {
      sessionRecord.file_content = fileContent;
      sessionRecord.file_type = fileType || 'text/csv';
      sessionRecord.file_size = fileSize || 0;
    }

    // Try insert, with progressive fallbacks for column compatibility
    let result = await db
      .from('upload_sessions')
      .insert(sessionRecord)
      .select('id')
      .single();

    // Fallback 1: retry without file columns (e.g. file_content column missing)
    if (result.error && fileContent) {
      console.warn('Insert with file content failed, retrying without:', result.error.message);
      delete sessionRecord.file_content;
      delete sessionRecord.file_type;
      delete sessionRecord.file_size;
      result = await db
        .from('upload_sessions')
        .insert(sessionRecord)
        .select('id')
        .single();
    }

    // Fallback 2: retry without user_id (FK constraint may fail if user not in users table)
    if (result.error && sessionRecord.user_id) {
      console.warn('Insert with user_id failed, retrying without:', result.error.message);
      sessionRecord.user_id = null;
      result = await db
        .from('upload_sessions')
        .insert(sessionRecord)
        .select('id')
        .single();
    }

    // Fallback 3: retry without enabled_rule_count (column may not exist)
    if (result.error && sessionRecord.enabled_rule_count !== undefined) {
      console.warn('Insert with enabled_rule_count failed, retrying without:', result.error.message);
      delete sessionRecord.enabled_rule_count;
      result = await db
        .from('upload_sessions')
        .insert(sessionRecord)
        .select('id')
        .single();
    }

    if (result.error) {
      console.error('Failed to save import history after all retries:', result.error.message);
      return NextResponse.json(
        { success: false, error: `Failed to save import session: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, sessionId: result.data?.id });
  } catch (error) {
    console.error('Save session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save import session' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all import history (upload_sessions and their rows)
export async function DELETE(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const db = getServerSupabase();

    // Delete all rows first (cascade should handle this but be explicit)
    const { data: sessions } = await db
      .from('upload_sessions')
      .select('id')
      .eq('account_id', accountId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s: { id: string }) => s.id);
      await db
        .from('upload_rows')
        .delete()
        .in('session_id', sessionIds);
    }

    // Delete all sessions
    const { error } = await db
      .from('upload_sessions')
      .delete()
      .eq('account_id', accountId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to clear history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: sessions?.length || 0,
    });
  } catch (error) {
    console.error('Clear history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear history' },
      { status: 500 }
    );
  }
}

// GET - List upload sessions for the account
export async function GET(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }
    const statusFilter = request.nextUrl.searchParams.get('status');

    const db = getServerSupabase();

    let query = db
      .from('upload_sessions')
      .select('id, file_name, status, total_rows, processed_rows, enriched_rows, synced_rows, failed_rows, error_message, retry_count, max_retries, file_size, expires_at, completed_at, created_at, updated_at, enabled_rule_count')
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
        fileSize: s.file_size,
        expiresAt: s.expires_at,
        completedAt: s.completed_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        enabledRuleCount: s.enabled_rule_count,
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
