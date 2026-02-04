import { NextRequest, NextResponse } from 'next/server';
import { runEnrichment } from '@/lib/enrichment';
import type { EnrichmentConfig, ParsedRow } from '@/types';

// POST - Run enrichment on provided rows (server-side)
// This is used by the client-side EnrichmentPanel to run AI/SERP enrichment
// through the server, since AI API calls require server-side env vars and
// cannot be made from the browser due to CORS.
export async function POST(request: NextRequest) {
  try {
    const { rows, configs } = await request.json() as {
      rows: ParsedRow[];
      configs: EnrichmentConfig[];
    };

    if (!rows || !configs) {
      return NextResponse.json(
        { success: false, error: 'rows and configs are required' },
        { status: 400 }
      );
    }

    const enabledConfigs = configs.filter((c) => c.isEnabled);
    const results: {
      rowIndex: number;
      enrichedData: Record<string, unknown>;
      success: boolean;
      error?: string;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const enrichedData: Record<string, unknown> = {};
      let allSuccess = true;
      let error: string | undefined;

      for (const config of enabledConfigs) {
        // Parse output field IDs
        let outputFieldIds: string[] = [];
        try {
          const parsed = JSON.parse(config.outputField);
          if (Array.isArray(parsed)) {
            outputFieldIds = parsed.map((f: { id: string }) => f.id);
          }
        } catch {
          outputFieldIds = [config.outputField];
        }

        // Skip if all output fields already have values
        const allHaveValues = outputFieldIds.every(
          (id) => row[id] && String(row[id]).trim()
        );
        if (allHaveValues) continue;

        const result = await runEnrichment(config, row);

        if (result.success && result.value) {
          if (outputFieldIds.length > 0) {
            enrichedData[outputFieldIds[0]] = result.value;
          } else {
            enrichedData[config.outputField] = result.value;
          }
        } else {
          allSuccess = false;
          error = result.error;
          console.error(`Enrichment failed for row ${i}, config "${config.name}": ${result.error}`);
        }

        // Rate limiting between API calls
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      results.push({
        rowIndex: i,
        enrichedData,
        success: allSuccess,
        error,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Enrich API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Enrichment failed' },
      { status: 500 }
    );
  }
}
