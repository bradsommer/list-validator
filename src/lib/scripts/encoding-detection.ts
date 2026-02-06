import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange } from './types';
import type { ParsedRow } from '@/types';

/**
 * Common mojibake patterns and their correct UTF-8 equivalents.
 * These occur when UTF-8 text is incorrectly decoded as Windows-1252/Latin-1.
 */
const MOJIBAKE_MAP: Record<string, string> = {
  // Smart quotes and apostrophes (UTF-8 interpreted as Windows-1252)
  '‚Äö√Ñ√¥': "'",   // Right single quote
  '‚Äô': "'",        // Right single quote variant
  '‚Äò': "'",        // Left single quote
  '‚Äú': '"',        // Left double quote
  '‚Äù': '"',        // Right double quote
  '‚Äî': '—',        // Em dash
  '‚Äì': '–',        // En dash
  '‚Ä¶': '…',        // Ellipsis

  // Accented characters (Latin-1 mojibake)
  '√©': 'é',         // e-acute
  '√®': 'è',         // e-grave
  '√°': 'á',         // a-acute
  '√±': 'ñ',         // n-tilde
  '√º': 'ü',         // u-umlaut
  '√∂': 'ö',         // o-umlaut
  '√§': 'ä',         // a-umlaut
  '√ü': 'ß',         // German eszett
  '√Ñ': 'Ä',         // A-umlaut
  '√ñ': 'Ö',         // O-umlaut
  '√ú': 'Ü',         // U-umlaut

  // Different encoding variants (Ã prefix pattern)
  'Ã©': 'é',         // e-acute
  'Ã¨': 'è',         // e-grave
  'Ã¡': 'á',         // a-acute
  'Ã±': 'ñ',         // n-tilde
  'Ã¼': 'ü',         // u-umlaut
  'Ã¶': 'ö',         // o-umlaut
  'Ã¤': 'ä',         // a-umlaut
  'ÃŸ': 'ß',         // German eszett
  'Ã„': 'Ä',         // A-umlaut
  'Ã–': 'Ö',         // O-umlaut
  'Ãœ': 'Ü',         // U-umlaut
  'Â´': "'",         // Acute accent as apostrophe

  // â€ prefix pattern (common in triple-encoded text)
  'â€™': "'",        // Right single quote
  'â€˜': "'",        // Left single quote
  'â€œ': '"',        // Left double quote
  'â€': '"',         // Right double quote
  'â€"': '—',        // Em dash
  'â€"': '–',        // En dash
  'â€¦': '…',        // Ellipsis

  // Complex multi-byte encoding issues
  'Ã¢â‚¬â„¢': "'",   // Complex encoding of apostrophe
  'Ã¢â‚¬Å"': '"',    // Complex encoding of left quote
  'Ã¢â‚¬': '"',      // Complex encoding of right quote
};

// Regex pattern to detect likely mojibake sequences
const MOJIBAKE_PATTERN = /[\xc0-\xc3][\x80-\xbf]{1,3}|[‚√Ã¢â€][\w\x80-\xff]{1,5}/;

/**
 * Attempts to fix mojibake text by:
 * 1. Replacing known mojibake sequences with correct characters
 * 2. Attempting to decode double-encoded UTF-8
 */
function fixMojibake(text: string): string {
  if (!text) return text;

  let result = text;

  // Replace known mojibake sequences (check longer patterns first)
  const sortedPatterns = Object.entries(MOJIBAKE_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [bad, good] of sortedPatterns) {
    if (result.includes(bad)) {
      result = result.split(bad).join(good);
    }
  }

  // If text still has suspicious patterns, try decode/encode fix
  if (MOJIBAKE_PATTERN.test(result)) {
    try {
      // Attempt to fix double-encoded UTF-8
      // This works by: text -> escape (to URI) -> decodeURIComponent (from URI)
      const fixed = decodeURIComponent(escape(result));
      if (fixed !== result && !MOJIBAKE_PATTERN.test(fixed)) {
        result = fixed;
      }
    } catch {
      // decodeURIComponent failed, keep current text
    }
  }

  return result;
}

export class EncodingDetectionScript implements IValidationScript {
  id = 'encoding-detection';
  name = 'Encoding Detection';
  description = 'Detects and fixes mojibake (garbled text from character encoding issues like UTF-8 decoded as Windows-1252)';
  type: 'transform' = 'transform';
  targetFields = ['*']; // Applies to all fields
  order = 5; // Run early, before other transforms

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Get all column headers from the data
    const allHeaders = headerMatches.map(m => m.originalHeader);

    rows.forEach((row, rowIndex) => {
      const newRow = { ...row };

      for (const header of allHeaders) {
        const originalValue = row[header];

        // Skip null, undefined, or non-string values
        if (originalValue === null || originalValue === undefined) {
          continue;
        }

        const valueStr = String(originalValue);
        if (valueStr.trim() === '') {
          continue;
        }

        // Check if the value contains mojibake patterns
        const hasMojibake = MOJIBAKE_PATTERN.test(valueStr) ||
          Object.keys(MOJIBAKE_MAP).some(pattern => valueStr.includes(pattern));

        if (hasMojibake) {
          const fixedValue = fixMojibake(valueStr);

          if (fixedValue !== valueStr) {
            newRow[header] = fixedValue;

            // Find the field name from header matches
            const match = headerMatches.find(m => m.originalHeader === header);
            const fieldName = match?.matchedField?.hubspotField || header;

            changes.push({
              rowIndex,
              field: fieldName,
              originalValue: valueStr,
              newValue: fixedValue,
              reason: 'Fixed character encoding issue (mojibake)',
            });
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

export const encodingDetectionScript = new EncodingDetectionScript();
