import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange } from './types';

// Cleans up whitespace issues across all fields
export const whitespaceCleanupScript: IValidationScript = {
  id: 'whitespace-cleanup',
  name: 'Whitespace Cleanup',
  description: 'Trims leading/trailing whitespace, removes extra spaces, and fixes common formatting issues',
  type: 'transform',
  targetFields: [], // Applies to all fields
  order: 1, // Run first before all other scripts

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const modifiedRows = rows.map((row) => ({ ...row }));

    // Get all matched headers
    const headers = headerMatches
      .filter((m) => m.isMatched)
      .map((m) => ({
        header: m.originalHeader,
        field: m.matchedField?.hubspotField || m.originalHeader,
      }));

    for (let i = 0; i < modifiedRows.length; i++) {
      for (const { header, field } of headers) {
        const value = modifiedRows[i][header];
        if (value === null || value === undefined) continue;

        const strValue = String(value);
        let cleaned = strValue;

        // Trim leading/trailing whitespace
        cleaned = cleaned.trim();

        // Replace multiple spaces with single space
        cleaned = cleaned.replace(/\s{2,}/g, ' ');

        // Remove non-breaking spaces
        cleaned = cleaned.replace(/\u00A0/g, ' ');

        // Remove zero-width characters
        cleaned = cleaned.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

        // Remove leading/trailing quotes that wrap the entire value
        if (
          (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
          (cleaned.startsWith("'") && cleaned.endsWith("'"))
        ) {
          const unquoted = cleaned.slice(1, -1).trim();
          if (unquoted.length > 0) {
            cleaned = unquoted;
          }
        }

        if (cleaned !== strValue) {
          modifiedRows[i][header] = cleaned;
          changes.push({
            rowIndex: i,
            field,
            originalValue: strValue,
            newValue: cleaned,
            reason: 'Cleaned whitespace/formatting',
          });
        }
      }
    }

    return {
      success: true,
      changes,
      errors: [],
      warnings: [],
      modifiedRows,
    };
  },
};
