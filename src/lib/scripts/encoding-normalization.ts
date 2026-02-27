import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange } from './types';
import type { ParsedRow } from '@/types';

// Common mojibake / encoding artifact patterns and their correct replacements
const ENCODING_REPLACEMENTS: [RegExp, string][] = [
  // UTF-8 interpreted as Windows-1252 (most common)
  [/â€™/g, '\u2019'],   // right single quote '
  [/â€˜/g, '\u2018'],   // left single quote '
  [/â€œ/g, '\u201C'],   // left double quote "
  [/â€\u009D/g, '\u201D'],  // right double quote "
  [/â€"/g, '\u2014'],   // em dash —
  [/â€"/g, '\u2013'],   // en dash –
  [/â€¦/g, '\u2026'],   // ellipsis …
  [/Ã©/g, 'é'],
  [/Ã¨/g, 'è'],
  [/Ã¡/g, 'á'],
  [/Ã /g, 'à'],
  [/Ã³/g, 'ó'],
  [/Ã²/g, 'ò'],
  [/Ã±/g, 'ñ'],
  [/Ã¼/g, 'ü'],
  [/Ã¶/g, 'ö'],
  [/Ã¤/g, 'ä'],
  [/Ã§/g, 'ç'],
  [/Ã®/g, 'î'],
  [/Ã¢/g, 'â'],
  [/Ã´/g, 'ô'],
  [/Ã»/g, 'û'],
  [/Ã¯/g, 'ï'],
  [/Ã«/g, 'ë'],
  [/Ã¦/g, 'æ'],
  // Replacement character
  [/\uFFFD/g, ''],
  // Null bytes
  [/\0/g, ''],
  // Common smart quote artifacts simplified to ASCII
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  [/[\u201C\u201D\u201E\u201F]/g, '"'],
  [/\u2014/g, '-'],
  [/\u2013/g, '-'],
  [/\u2026/g, '...'],
  // Non-breaking space → regular space
  [/\u00A0/g, ' '],
];

export class EncodingNormalizationScript implements IValidationScript {
  id = 'encoding-normalization';
  name = 'Encoding Normalization';
  description = 'Fixes common character encoding issues (mojibake), smart quotes, and invisible characters across all text fields.';
  type: 'transform' = 'transform';
  targetFields = ['*'];
  order = 5; // Run very early, before other scripts process the data

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows } = context;
    const changes: ScriptChange[] = [];
    const modifiedRows: ParsedRow[] = [];

    rows.forEach((row, index) => {
      const newRow = { ...row };
      let rowChanged = false;

      for (const key of Object.keys(newRow)) {
        const value = newRow[key];
        if (typeof value !== 'string' || !value) continue;

        let cleaned = value;
        for (const [pattern, replacement] of ENCODING_REPLACEMENTS) {
          cleaned = cleaned.replace(pattern, replacement);
        }

        if (cleaned !== value) {
          newRow[key] = cleaned;
          if (!rowChanged) {
            changes.push({
              rowIndex: index,
              field: key,
              originalValue: value,
              newValue: cleaned,
              reason: `Fixed encoding artifacts in "${key}"`,
            });
            rowChanged = true;
          }
        }
      }

      modifiedRows.push(newRow);
    });

    return {
      success: true,
      changes,
      errors: [],
      warnings: [],
      modifiedRows,
    };
  }
}

export const encodingNormalizationScript = new EncodingNormalizationScript();
