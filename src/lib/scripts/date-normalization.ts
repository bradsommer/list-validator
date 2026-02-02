import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning, ScriptError } from './types';

// Common date fields in HubSpot
const DATE_FIELDS = ['date_of_birth', 'closedate', 'createdate', 'hs_lifecyclestage_lead_date'];

// Parse various date formats and normalize to YYYY-MM-DD
function parseDate(value: string): { date: string; format: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, format: 'YYYY-MM-DD' };
  }

  // MM/DD/YYYY or M/D/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, format: 'MM/DD/YYYY' };
  }

  // MM/DD/YY or M/D/YY
  const usShortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (usShortMatch) {
    const [, m, d, y] = usShortMatch;
    const fullYear = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    return { date: `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, format: 'MM/DD/YY' };
  }

  // DD-MM-YYYY or DD.MM.YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    // Heuristic: if first number > 12, it's definitely DD-MM
    if (parseInt(d) > 12) {
      return { date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, format: 'DD-MM-YYYY' };
    }
    // If second number > 12, it's MM-DD
    if (parseInt(m) > 12) {
      return { date: `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`, format: 'MM-DD-YYYY' };
    }
    // Ambiguous - assume MM-DD-YYYY (US convention)
    return { date: `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`, format: 'MM-DD-YYYY (assumed)' };
  }

  // "Month DD, YYYY" or "Month DD YYYY"
  const longMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMatch) {
    const [, monthStr, d, y] = longMatch;
    const m = monthNameToNumber(monthStr);
    if (m) {
      return { date: `${y}-${String(m).padStart(2, '0')}-${d.padStart(2, '0')}`, format: 'Month DD, YYYY' };
    }
  }

  // "DD Month YYYY"
  const euLongMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (euLongMatch) {
    const [, d, monthStr, y] = euLongMatch;
    const m = monthNameToNumber(monthStr);
    if (m) {
      return { date: `${y}-${String(m).padStart(2, '0')}-${d.padStart(2, '0')}`, format: 'DD Month YYYY' };
    }
  }

  // YYYYMMDD (compact)
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, y, m, d] = compactMatch;
    return { date: `${y}-${m}-${d}`, format: 'YYYYMMDD' };
  }

  // Unix timestamp (seconds or milliseconds)
  const num = Number(trimmed);
  if (!isNaN(num) && num > 0) {
    const ts = num > 1e12 ? num : num * 1000; // Convert seconds to ms if needed
    const date = new Date(ts);
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return { date: `${y}-${m}-${d}`, format: 'timestamp' };
    }
  }

  return null;
}

function monthNameToNumber(name: string): number | null {
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };
  return months[name.toLowerCase()] || null;
}

export const dateNormalizationScript: IValidationScript = {
  id: 'date-normalization',
  name: 'Date Normalization',
  description: 'Standardizes various date formats (MM/DD/YY, DD-MM-YYYY, etc.) to YYYY-MM-DD',
  type: 'transform',
  targetFields: DATE_FIELDS,
  order: 35,

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const errors: ScriptError[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows = rows.map((row) => ({ ...row }));

    // Find date columns - match by HubSpot field type or common names
    const dateHeaders: { header: string; field: string }[] = [];

    for (const match of headerMatches) {
      if (!match.isMatched || !match.matchedField) continue;

      const fieldName = match.matchedField.hubspotField.toLowerCase();
      const headerLower = match.originalHeader.toLowerCase();

      if (
        DATE_FIELDS.includes(fieldName) ||
        fieldName.includes('date') ||
        headerLower.includes('date') ||
        headerLower.includes('birthday') ||
        headerLower.includes('dob')
      ) {
        dateHeaders.push({ header: match.originalHeader, field: fieldName });
      }
    }

    if (dateHeaders.length === 0) {
      return { success: true, changes: [], errors: [], warnings: [], modifiedRows: rows };
    }

    for (let i = 0; i < modifiedRows.length; i++) {
      for (const { header, field } of dateHeaders) {
        const value = String(modifiedRows[i][header] || '').trim();
        if (!value) continue;

        // Skip if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) continue;

        const parsed = parseDate(value);
        if (parsed) {
          if (parsed.date !== value) {
            modifiedRows[i][header] = parsed.date;
            changes.push({
              rowIndex: i,
              field,
              originalValue: value,
              newValue: parsed.date,
              reason: `Converted from ${parsed.format} to YYYY-MM-DD`,
            });
          }
        } else {
          errors.push({
            rowIndex: i,
            field,
            value,
            errorType: 'invalid_date',
            message: `Could not parse date value: "${value}"`,
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      changes,
      errors,
      warnings,
      modifiedRows,
    };
  },
};
