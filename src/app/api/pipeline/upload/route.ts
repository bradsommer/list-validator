import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
const BATCH_INSERT_SIZE = 500;

// POST - Create upload session and store rows in DB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileName,
      rows,
      fieldMappings,
      enrichmentConfigIds,
    } = body as {
      fileName: string;
      rows: Record<string, unknown>[];
      fieldMappings: Record<string, string>;
      enrichmentConfigIds?: string[];
    };

    const accountId = request.headers.get('x-account-id') || DEFAULT_ACCOUNT_ID;

    if (!fileName || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'fileName and non-empty rows array are required' },
        { status: 400 }
      );
    }

    // Create the upload session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        account_id: accountId,
        file_name: fileName,
        status: 'uploaded',
        total_rows: rows.length,
        field_mappings: fieldMappings || {},
        enrichment_config_ids: enrichmentConfigIds || [],
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Failed to create upload session:', sessionError?.message);
      return NextResponse.json(
        { success: false, error: 'Failed to create upload session' },
        { status: 500 }
      );
    }

    // Insert rows in batches
    let insertedCount = 0;
    for (let i = 0; i < rows.length; i += BATCH_INSERT_SIZE) {
      const batch = rows.slice(i, i + BATCH_INSERT_SIZE).map((row, idx) => ({
        session_id: session.id,
        row_index: i + idx,
        raw_data: row,
        enriched_data: {},
        status: 'pending',
      }));

      const { error: rowError } = await supabase
        .from('upload_rows')
        .insert(batch);

      if (rowError) {
        console.error(`Failed to insert row batch starting at ${i}:`, rowError.message);
        // Clean up the session on failure
        await supabase.from('upload_sessions').delete().eq('id', session.id);
        return NextResponse.json(
          { success: false, error: `Failed to store rows (batch starting at row ${i})` },
          { status: 500 }
        );
      }

      insertedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      totalRows: insertedCount,
      status: 'uploaded',
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error('Pipeline upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
