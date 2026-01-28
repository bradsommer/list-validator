import { NextRequest } from 'next/server';
import { processRowForHubSpot } from '@/lib/hubspot';
import { logInfo, logError, logSuccess } from '@/lib/logger';
import type { ParsedRow } from '@/types';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { rows, taskAssigneeId, sessionId } = body as {
          rows: ParsedRow[];
          taskAssigneeId: string;
          sessionId: string;
        };

        await logInfo('hubspot', `Starting sync for ${rows.length} rows`, sessionId);

        for (let i = 0; i < rows.length; i++) {
          try {
            // Send progress update
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'progress',
                  completed: i + 1,
                  total: rows.length,
                }) + '\n'
              )
            );

            // Process the row
            const result = await processRowForHubSpot(i, rows[i], taskAssigneeId);

            // Send result
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'result',
                  result,
                }) + '\n'
              )
            );

            // Rate limiting - wait between API calls
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            await logError('hubspot', `Error processing row ${i + 1}`, sessionId, { error });

            // Send error result
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'result',
                  result: {
                    rowIndex: i,
                    contact: { email: rows[i].email },
                    matchedCompany: null,
                    matchConfidence: 0,
                    matchType: 'no_match',
                    taskCreated: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                  },
                }) + '\n'
              )
            );
          }
        }

        await logSuccess('hubspot', `Sync complete for ${rows.length} rows`, sessionId);
        controller.close();
      } catch (error) {
        console.error('Sync error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
}
