import { NextRequest, NextResponse } from 'next/server';
import { runEnrichment } from '@/lib/enrichment';
import { logInfo, logError } from '@/lib/logger';
import type { EnrichmentConfig, ParsedRow } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, rowData, sessionId } = body as {
      config: EnrichmentConfig;
      rowData: ParsedRow;
      sessionId: string;
    };

    await logInfo('enrich', `Running enrichment: ${config.name}`, sessionId);

    const result = await runEnrichment(config, rowData);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Enrichment error:', error);
    await logError('enrich', 'Enrichment failed', '', { error });

    return NextResponse.json(
      {
        value: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
