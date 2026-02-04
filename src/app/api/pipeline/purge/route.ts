import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Purge expired sessions (15-day TTL)
// Can be called by cron job or manually from admin
export async function POST() {
  try {
    const now = new Date().toISOString();

    // Find expired sessions that still have data
    const { data: expiredSessions, error: fetchError } = await supabase
      .from('upload_sessions')
      .select('id, file_name, status, total_rows')
      .lt('expires_at', now)
      .neq('status', 'expired')
      .neq('status', 'completed');

    if (fetchError) {
      console.error('Failed to fetch expired sessions:', fetchError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expired sessions' },
        { status: 500 }
      );
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired sessions to purge',
        purgedCount: 0,
      });
    }

    let purgedCount = 0;
    const purgedSessions: string[] = [];

    for (const session of expiredSessions) {
      // Delete all rows for this session
      const { error: deleteRowsError } = await supabase
        .from('upload_rows')
        .delete()
        .eq('session_id', session.id);

      if (deleteRowsError) {
        console.error(`Failed to purge rows for session ${session.id}:`, deleteRowsError.message);
        continue;
      }

      // Mark session as expired, clear stored file content (keep metadata for audit)
      await supabase
        .from('upload_sessions')
        .update({
          status: 'expired',
          file_content: null,
          error_message: `Data purged after 15-day retention period (original status: ${session.status})`,
        })
        .eq('id', session.id);

      purgedCount++;
      purgedSessions.push(session.id);
      console.log(`Purged expired session ${session.id} (${session.file_name}, ${session.total_rows} rows)`);
    }

    return NextResponse.json({
      success: true,
      message: `Purged ${purgedCount} expired sessions`,
      purgedCount,
      purgedSessionIds: purgedSessions,
    });
  } catch (error) {
    console.error('Pipeline purge error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purge expired sessions' },
      { status: 500 }
    );
  }
}
