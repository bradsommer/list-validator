import { NextRequest } from 'next/server';
import { processRowForHubSpot, getValidAccessToken, resetClient } from '@/lib/hubspot';
import { logInfo, logError, logSuccess } from '@/lib/logger';

interface SyncRow {
  contactProperties: Record<string, string>;
  companyProperties: Record<string, string>;
}

// Check if an error is a HubSpot 401 authentication error
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errStr = String(error);
  if (errStr.includes('401') || errStr.includes('EXPIRED_AUTHENTICATION')) return true;
  if ('code' in error && error.code === 401) return true;
  if ('statusCode' in error && error.statusCode === 401) return true;
  if ('status' in error && error.status === 401) return true;
  if ('message' in error && typeof (error as { message: string }).message === 'string') {
    const msg = (error as { message: string }).message;
    if (msg.includes('401') || msg.includes('expired') || msg.includes('EXPIRED_AUTHENTICATION')) return true;
  }
  if ('body' in error && typeof (error as { body: string }).body === 'string') {
    const body = (error as { body: string }).body;
    if (body.includes('EXPIRED_AUTHENTICATION') || body.includes('expired')) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { rows, taskAssigneeId, sessionId } = body as {
          rows: SyncRow[];
          taskAssigneeId: string;
          sessionId: string;
        };

        await logInfo('hubspot', `Starting sync for ${rows.length} rows`, sessionId);

        // Force a fresh token check before starting the sync batch.
        // This ensures we pick up any re-authenticated tokens from the DB.
        resetClient();
        const token = await getValidAccessToken();
        if (!token) {
          const errMsg = 'HubSpot OAuth token is missing or expired. Please reconnect HubSpot in Admin > Integrations.';
          await logError('hubspot', errMsg, sessionId);
          // Send error for all rows and close
          for (let i = 0; i < rows.length; i++) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'result',
                  result: {
                    rowIndex: i,
                    contact: { email: rows[i].contactProperties?.email || '' },
                    matchedCompany: null,
                    matchConfidence: 0,
                    matchType: 'no_match',
                    taskCreated: false,
                    error: errMsg,
                  },
                }) + '\n'
              )
            );
          }
          controller.close();
          return;
        }

        let consecutiveAuthErrors = 0;

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

            // Log row data for debugging
            console.log(`Sync row ${i}: contactProps=${JSON.stringify(Object.keys(rows[i].contactProperties || {}))}, companyProps=${JSON.stringify(Object.keys(rows[i].companyProperties || {}))}`);

            // Process the row with separated contact/company properties
            const result = await processRowForHubSpot(
              i,
              rows[i].contactProperties || {},
              rows[i].companyProperties || {},
              taskAssigneeId
            );

            consecutiveAuthErrors = 0; // Reset on success

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
            // If it's a 401 auth error, try to refresh once then abort if it persists
            if (isAuthError(error)) {
              consecutiveAuthErrors++;
              console.error(`Auth error on row ${i} (consecutive: ${consecutiveAuthErrors}):`, error);

              if (consecutiveAuthErrors >= 2) {
                // Auth is truly broken — abort remaining rows with clear message
                const errMsg = 'HubSpot OAuth token expired. Please reconnect HubSpot in Admin > Integrations and try again.';
                await logError('hubspot', errMsg, sessionId);

                // Send error for current and all remaining rows
                for (let j = i; j < rows.length; j++) {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: 'result',
                        result: {
                          rowIndex: j,
                          contact: { email: rows[j].contactProperties?.email || '' },
                          matchedCompany: null,
                          matchConfidence: 0,
                          matchType: 'no_match',
                          taskCreated: false,
                          error: errMsg,
                        },
                      }) + '\n'
                    )
                  );
                }
                break; // Stop processing — all remaining rows will fail the same way
              }

              // First auth error — try to force-refresh the client from DB
              resetClient();
            }

            await logError('hubspot', `Error processing row ${i + 1}`, sessionId, { error });

            // Send error result
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'result',
                  result: {
                    rowIndex: i,
                    contact: { email: rows[i].contactProperties?.email || '' },
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
