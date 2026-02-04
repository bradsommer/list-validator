import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runEnrichment } from '@/lib/enrichment';
import type { EnrichmentConfig, ParsedRow } from '@/types';

const BATCH_SIZE = 50;

// POST - Run enrichment on stored rows for a session
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json() as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
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

    if (!['uploaded', 'failed'].includes(session.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot enrich session in status: ${session.status}` },
        { status: 400 }
      );
    }

    // Fetch enrichment configs
    const configIds: string[] = session.enrichment_config_ids || [];
    let configs: EnrichmentConfig[] = [];

    if (configIds.length > 0) {
      const { data: configData } = await supabase
        .from('enrichment_configs')
        .select('*, ai_model:ai_models!ai_model_id(name, provider, model_id, api_key_encrypted, use_env_key, env_key_name, base_url)')
        .in('id', configIds)
        .eq('is_enabled', true)
        .order('execution_order');

      if (configData) {
        configs = configData.map((c: Record<string, unknown>) => {
          // Supabase may return ai_model as null, an object, or an array
          let aiModel = c.ai_model as {
            provider: string;
            model_id: string;
            api_key_encrypted: string | null;
            use_env_key: boolean;
            env_key_name: string | null;
            base_url: string | null;
          } | null;
          if (Array.isArray(aiModel)) {
            aiModel = aiModel[0] || null;
          }
          const hasAiModel = aiModel && aiModel.provider && aiModel.provider !== 'serp';

          return {
            id: c.id as string,
            name: c.name as string,
            description: (c.description as string) || '',
            prompt: c.prompt_template as string,
            inputFields: (c.input_fields as string[]) || [],
            outputField: c.output_field as string,
            service: hasAiModel ? 'ai' as const : 'serp' as const,
            isEnabled: c.is_enabled as boolean,
            createdAt: c.created_at as string,
            updatedAt: c.updated_at as string,
            aiModel: hasAiModel && aiModel ? {
              provider: aiModel.provider,
              modelId: aiModel.model_id,
              apiKey: aiModel.use_env_key
                ? undefined
                : (aiModel.api_key_encrypted || undefined),
              baseUrl: aiModel.base_url || undefined,
              envKeyName: aiModel.env_key_name || undefined,
            } : undefined,
          };
        });
      }
    }

    // Update session status
    await supabase
      .from('upload_sessions')
      .update({ status: 'enriching', error_message: null })
      .eq('id', sessionId);

    // If no enrichment configs, skip straight to enriched
    if (configs.length === 0) {
      // Mark all rows as enriched
      await supabase
        .from('upload_rows')
        .update({ status: 'enriched' })
        .eq('session_id', sessionId)
        .eq('status', 'pending');

      const { count } = await supabase
        .from('upload_rows')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      await supabase
        .from('upload_sessions')
        .update({
          status: 'enriched',
          enriched_rows: count || session.total_rows,
          processed_rows: count || session.total_rows,
        })
        .eq('id', sessionId);

      return NextResponse.json({
        success: true,
        sessionId,
        status: 'enriched',
        message: 'No enrichment configs selected — rows ready for sync',
        enrichedRows: count || session.total_rows,
      });
    }

    // Process rows in batches
    let totalEnriched = 0;
    let totalProcessed = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch a batch of pending rows
      const { data: rows, error: fetchError } = await supabase
        .from('upload_rows')
        .select('*')
        .eq('session_id', sessionId)
        .in('status', ['pending', 'failed'])
        .order('row_index')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError || !rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of rows) {
        // Mark row as enriching
        await supabase
          .from('upload_rows')
          .update({ status: 'enriching' })
          .eq('id', row.id);

        const rowData = { ...row.raw_data, ...row.enriched_data } as ParsedRow;
        const enrichedData = { ...(row.enriched_data || {}) };
        let rowSuccess = true;
        let rowError: string | undefined;

        for (const config of configs) {
          try {
            const result = await runEnrichment(config, rowData);
            if (result.success && result.value) {
              // For JSON output fields, parse the output field IDs
              try {
                const outputFields = JSON.parse(config.outputField);
                if (Array.isArray(outputFields) && outputFields.length > 0) {
                  enrichedData[outputFields[0].id] = result.value;
                }
              } catch {
                // Legacy single string output field
                enrichedData[config.outputField] = result.value;
              }
            } else if (!result.success) {
              rowSuccess = false;
              rowError = result.error;
            }
          } catch (err) {
            rowSuccess = false;
            rowError = err instanceof Error ? err.message : 'Enrichment error';
          }

          // Rate limiting between API calls
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Update the row
        await supabase
          .from('upload_rows')
          .update({
            enriched_data: enrichedData,
            status: rowSuccess ? 'enriched' : 'failed',
            error_message: rowError || null,
          })
          .eq('id', row.id);

        totalProcessed++;
        if (rowSuccess) totalEnriched++;

        // Update session progress
        await supabase
          .from('upload_sessions')
          .update({
            processed_rows: totalProcessed,
            enriched_rows: totalEnriched,
          })
          .eq('id', sessionId);
      }

      // If we got fewer than batch size, we're done
      if (rows.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
    }

    // Update session to enriched
    await supabase
      .from('upload_sessions')
      .update({
        status: 'enriched',
        processed_rows: totalProcessed,
        enriched_rows: totalEnriched,
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      status: 'enriched',
      totalProcessed,
      totalEnriched,
    });
  } catch (error) {
    console.error('Pipeline enrich error:', error);
    return NextResponse.json(
      { success: false, error: 'Enrichment processing failed' },
      { status: 500 }
    );
  }
}
