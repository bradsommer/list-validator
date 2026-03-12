import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

/**
 * Known mojibake sequences mapped to their correct characters.
 * These occur when UTF-8 text is decoded as Windows-1252 (sometimes multiple times).
 * Ordered longest-first so longer sequences match before shorter substrings.
 */
const MOJIBAKE_MAP: [RegExp, string][] = [
  // Triple-encoded sequences (UTF-8 → CP1252 → CP1252 → CP1252)
  [/\u00c3\u00a4\u00c3\u00b6\u00e2\u0088\u009a\u00c3\u0091\u00e2\u0088\u009a\u00c2\u00a5/g, 'a'],  // Äö√Ñ√¥ → a
  [/\u00e2\u0080\u009a\u00c3\u00a4\u00c3\u00b6\u00e2\u0088\u009a\u00c3\u0091\u00e2\u0088\u009a\u00c2\u00a5/g, "'"],  // ‚Äö√Ñ√¥ → '

  // Double-encoded smart quotes and punctuation
  [/\u00e2\u0080\u0099/g, "'"],    // â€™ → ' (right single quote)
  [/\u00e2\u0080\u0098/g, "'"],    // â€˜ → ' (left single quote)
  [/\u00e2\u0080\u009c/g, '"'],    // â€œ → " (left double quote)
  [/\u00e2\u0080\u009d/g, '"'],    // â€ → " (right double quote)
  [/\u00e2\u0080\u009a/g, "'"],    // â€š → ' (single low-9 quote)
  [/\u00e2\u0080\u009e/g, '"'],    // â€ž → " (double low-9 quote)
  [/\u00e2\u0080\u0093/g, '-'],    // â€" → – (en dash)
  [/\u00e2\u0080\u0094/g, '-'],    // â€" → — (em dash)
  [/\u00e2\u0080\u00a6/g, '...'],  // â€¦ → … (ellipsis)
  [/\u00e2\u0080\u00a2/g, '-'],    // â€¢ → bullet
  [/\u00e2\u0084\u00a2/g, 'TM'],   // â„¢ → ™
  [/\u00c2\u00ae/g, '(R)'],        // Â® → ®
  [/\u00c2\u00a9/g, '(C)'],        // Â© → ©

  // Common CP1252 → UTF-8 double-encoding (Ã + char)
  [/\u00c3\u00a9/g, 'e'],   // Ã© → é
  [/\u00c3\u00a8/g, 'e'],   // Ã¨ → è
  [/\u00c3\u00aa/g, 'e'],   // Ãª → ê
  [/\u00c3\u00ab/g, 'e'],   // Ã« → ë
  [/\u00c3\u00a0/g, 'a'],   // Ã  → à
  [/\u00c3\u00a1/g, 'a'],   // Ã¡ → á
  [/\u00c3\u00a2/g, 'a'],   // Ã¢ → â
  [/\u00c3\u00a3/g, 'a'],   // Ã£ → ã
  [/\u00c3\u00a4/g, 'a'],   // Ã¤ → ä
  [/\u00c3\u00a5/g, 'a'],   // Ã¥ → å
  [/\u00c3\u00b1/g, 'n'],   // Ã± → ñ
  [/\u00c3\u00b2/g, 'o'],   // Ã² → ò
  [/\u00c3\u00b3/g, 'o'],   // Ã³ → ó
  [/\u00c3\u00b4/g, 'o'],   // Ã´ → ô
  [/\u00c3\u00b6/g, 'o'],   // Ã¶ → ö
  [/\u00c3\u00b9/g, 'u'],   // Ã¹ → ù
  [/\u00c3\u00ba/g, 'u'],   // Ãº → ú
  [/\u00c3\u00bb/g, 'u'],   // Ã» → û
  [/\u00c3\u00bc/g, 'u'],   // Ã¼ → ü
  [/\u00c3\u00ad/g, 'i'],   // Ã­ → í
  [/\u00c3\u00ae/g, 'i'],   // Ã® → î
  [/\u00c3\u00af/g, 'i'],   // Ã¯ → ï
  [/\u00c3\u00ac/g, 'i'],   // Ã¬ → ì

  // Stray Â (artifact from double-encoding non-breaking space, etc.)
  [/\u00c2\u00a0/g, ' '],   // Â  → non-breaking space → regular space
  [/\u00c2\u00ab/g, '"'],   // Â« → «
  [/\u00c2\u00bb/g, '"'],   // Â» → »

  // Common standalone mojibake fragments
  [/\u00c3\u201a/g, ''],    // Ã‚
  [/\u00c3\u0192/g, ''],    // Ãƒ
  [/\u00c2/g, ''],           // Stray Â
];

/**
 * Regex to detect strings that likely contain mojibake.
 * Checks for sequences of high-Latin characters mixed with special symbols
 * that are characteristic of encoding corruption.
 */
const MOJIBAKE_DETECTOR = /[\u00c0-\u00c3][\u00a0-\u00ff]|[\u00e2][\u0080-\u0084][\u0080-\u00ff]|\u00c2[\u00a0-\u00bf]|\u00e2\u0088\u009a/;

/**
 * Additional cleanup: strip remaining non-printable characters (except newlines/tabs)
 * but preserve legitimate extended ASCII and Unicode.
 */
const NON_PRINTABLE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function cleanValue(value: string): string {
  let cleaned = value;

  // Apply mojibake replacements (longest sequences first)
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // Strip non-printable control characters
  cleaned = cleaned.replace(NON_PRINTABLE, '');

  // Collapse multiple spaces into one and trim
  cleaned = cleaned.replace(/  +/g, ' ').trim();

  return cleaned;
}

export class MojibakeCleanupScript implements IValidationScript {
  id = 'mojibake-cleanup';
  name = 'Encoding Cleanup';
  description = 'Removes garbled characters (mojibake) caused by encoding issues in spreadsheets. Fixes corrupted quotes, accents, dashes, and other symbols.';
  type: 'transform' = 'transform';
  targetFields = ['*'];
  order = 5;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    rows.forEach((row, index) => {
      const newRow = { ...row };
      let rowModified = false;

      for (const [key, value] of Object.entries(row)) {
        if (value === null || value === undefined) continue;
        const valueStr = String(value);

        // Quick check: skip if no mojibake detected
        if (!MOJIBAKE_DETECTOR.test(valueStr)) continue;

        const cleaned = cleanValue(valueStr);

        if (cleaned !== valueStr) {
          newRow[key] = cleaned;
          rowModified = true;

          changes.push({
            rowIndex: index,
            field: key,
            originalValue: valueStr,
            newValue: cleaned,
            reason: `Cleaned encoding artifacts from "${key}"`,
          });
        }
      }

      if (rowModified) {
        warnings.push({
          rowIndex: index,
          field: '',
          value: null,
          warningType: 'mojibake_detected',
          message: `Row ${index + 1} contained garbled characters that were cleaned up`,
        });
      }

      modifiedRows.push(newRow);
    });

    return {
      success: true,
      changes,
      errors: [],
      warnings,
      modifiedRows,
    };
  }
}

export const mojibakeCleanupScript = new MojibakeCleanupScript();
