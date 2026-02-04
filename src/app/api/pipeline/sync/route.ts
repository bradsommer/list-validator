import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processRowForHubSpot } from '@/lib/hubspot';
import type { ParsedRow } from '@/types';

const BATCH_SIZE = 50;

// POST - Push enriched rows to HubSpot, delete on success
export async function POST(request: NextRequest) {
  try {
    const { sessionId, taskAssigneeId } = await request.json() as {
      sessionId: string;
      taskAssigneeId: string;
    };

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!taskAssigneeId) {
      return NextResponse.json(
        { success: false, error: 'taskAssigneeId is required' },
        { status: 400 }
      );
    }

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Upload session not found' },
        { status: 404 }
      );
    }

    if (!['enriched', 'failed'].includes(session.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot sync session in status: ${session.status}` },
        { status: 400 }
      );
    }

    // Update session status
    await supabase
      .from('upload_sessions')
      .update({
        status: 'syncing',
        error_message: null,
        retry_count: session.status === 'failed' ? session.retry_count + 1 : session.retry_count,
      })
      .eq('id', sessionId);

    let totalSynced = 0;
    let totalFailed = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch rows that need syncing (enriched or previously failed)
      const { data: rows, error: fetchError } = await supabase
        .from('upload_rows')
        .select('*')
        .eq('session_id', sessionId)
        .in('status', ['enriched', 'failed'])
        .order('row_index')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError || !rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of rows) {
        // Mark row as syncing
        await supabase
          .from('upload_rows')
          .update({ status: 'syncing' })
          .eq('id', row.id);

        try {
          // Merge raw + enriched data for HubSpot
          const mergedData: ParsedRow = {
            ...(row.raw_data as Record<string, unknown>),
            ...(row.enriched_data as Record<string, unknown>),
          } as ParsedRow;

          // Process the row through HubSpot
          const result = await processRowForHubSpot(row.row_index, mergedData, taskAssigneeId);

          // Mark as synced
          await supabase
            .from('upload_rows')
            .update({
              status: 'synced',
              hubspot_contact_id: result.contact?.email || null,
              hubspot_company_id: result.matchedCompany?.id || null,
              error_message: null,
            })
            .eq('id', row.id);

          totalSynced++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'HubSpot sync error';

          await supabase
            .from('upload_rows')
            .update({
              status: 'failed',
              error_message: errorMsg,
            })
            .eq('id', row.id);

          totalFailed++;
        }

        // Update session progress
        await supabase
          .from('upload_sessions')
          .update({
            synced_rows: totalSynced,
            failed_rows: totalFailed,
          })
          .eq('id', sessionId);

        // Rate limiting between HubSpot API calls
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (rows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    // Determine final session status
    const allSynced = totalFailed === 0;

    if (allSynced) {
      // Delete all synced rows — PII is cleared
      await supabase
        .from('upload_rows')
        .delete()
        .eq('session_id', sessionId)
        .eq('status', 'synced');

      await supabase
        .from('upload_sessions')
        .update({
          status: 'completed',
          synced_rows: totalSynced,
          failed_rows: 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return NextResponse.json({
        success: true,
        sessionId,
        status: 'completed',
        totalSynced,
        totalFailed: 0,
        message: `All ${totalSynced} rows synced to HubSpot. Data has been cleared.`,
      });
    } else {
      // Some rows failed — keep failed rows for retry, delete synced ones
      await supabase
        .from('upload_rows')
        .delete()
        .eq('session_id', sessionId)
        .eq('status', 'synced');

      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          synced_rows: totalSynced,
          failed_rows: totalFailed,
          error_message: `${totalFailed} rows failed to sync to HubSpot. ${totalSynced} rows synced successfully.`,
        })
        .eq('id', sessionId);

      return NextResponse.json({
        success: false,
        sessionId,
        status: 'failed',
        totalSynced,
        totalFailed,
        message: `${totalFailed} rows failed to sync. Successfully synced rows have been cleared. Failed rows are retained for retry (expires ${session.expires_at}).`,
      });
    }
  } catch (error) {
    console.error('Pipeline sync error:', error);
    return NextResponse.json(
      { success: false, error: 'HubSpot sync failed' },
      { status: 500 }
    );
  }
}
