import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning, ScriptError } from './types';

// Parse various date formats and normalize to MM/DD/YYYY
function parseDate(value: string): { month: number; day: number; year: number; format: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return { year: parseInt(y), month: parseInt(m), day: parseInt(d), format: 'YYYY-MM-DD' };
  }

  // MM/DD/YYYY or M/D/YYYY (already target format, but might need zero-padding)
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return { year: parseInt(y), month: parseInt(m), day: parseInt(d), format: 'MM/DD/YYYY' };
  }

  // MM/DD/YY or M/D/YY
  const usShortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (usShortMatch) {
    const [, m, d, y] = usShortMatch;
    const fullYear = parseInt(y) > 50 ? 1900 + parseInt(y) : 2000 + parseInt(y);
    return { year: fullYear, month: parseInt(m), day: parseInt(d), format: 'MM/DD/YY' };
  }

  // DD-MM-YYYY or DD.MM.YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (euMatch) {
    const [, a, b, y] = euMatch;
    // Heuristic: if first number > 12, it's DD-MM
    if (parseInt(a) > 12) {
      return { year: parseInt(y), month: parseInt(b), day: parseInt(a), format: 'DD-MM-YYYY' };
    }
    // If second number > 12, it's MM-DD
    if (parseInt(b) > 12) {
      return { year: parseInt(y), month: parseInt(a), day: parseInt(b), format: 'MM-DD-YYYY' };
    }
    // Ambiguous - assume MM-DD-YYYY (US convention)
    return { year: parseInt(y), month: parseInt(a), day: parseInt(b), format: 'MM-DD-YYYY (assumed)' };
  }

  // "Month DD, YYYY" or "Month DD YYYY"
  const longMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMatch) {
    const [, monthStr, d, y] = longMatch;
    const m = monthNameToNumber(monthStr);
    if (m) {
      return { year: parseInt(y), month: m, day: parseInt(d), format: 'Month DD, YYYY' };
    }
  }

  // "DD Month YYYY"
  const euLongMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (euLongMatch) {
    const [, d, monthStr, y] = euLongMatch;
    const m = monthNameToNumber(monthStr);
    if (m) {
      return { year: parseInt(y), month: m, day: parseInt(d), format: 'DD Month YYYY' };
    }
  }

  // YYYYMMDD (compact)
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, y, m, d] = compactMatch;
    return { year: parseInt(y), month: parseInt(m), day: parseInt(d), format: 'YYYYMMDD' };
  }

  // Unix timestamp (seconds or milliseconds)
  const num = Number(trimmed);
  if (!isNaN(num) && num > 0) {
    const ts = num > 1e12 ? num : num * 1000;
    const date = new Date(ts);
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        format: 'timestamp',
      };
    }
  }

  return null;
}

// Parse date/time values — returns DD/MM/YYYY HH:MM for HubSpot datetime fields
function parseDateTime(value: string): { formatted: string; format: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO format with time: YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM
  const isoTimeMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (isoTimeMatch) {
    const [, y, m, d, h, min] = isoTimeMatch;
    return {
      formatted: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y} ${h.padStart(2, '0')}:${min}`,
      format: 'ISO datetime',
    };
  }

  // MM/DD/YYYY HH:MM
  const usTimeMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (usTimeMatch) {
    const [, m, d, y, h, min] = usTimeMatch;
    return {
      formatted: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y} ${h.padStart(2, '0')}:${min}`,
      format: 'US datetime',
    };
  }

  // DD/MM/YYYY HH:MM (already target format)
  const euTimeMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (euTimeMatch) {
    const [, a, b, y, h, min] = euTimeMatch;
    if (parseInt(a) > 12) {
      // First is day
      return {
        formatted: `${a.padStart(2, '0')}/${b.padStart(2, '0')}/${y} ${h.padStart(2, '0')}:${min}`,
        format: 'EU datetime',
      };
    }
  }

  // Unix timestamp with time
  const num = Number(trimmed);
  if (!isNaN(num) && num > 0) {
    const ts = num > 1e12 ? num : num * 1000;
    const date = new Date(ts);
    if (!isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return {
        formatted: `${d}/${m}/${y} ${h}:${min}`,
        format: 'timestamp',
      };
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

function formatDate(month: number, day: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

function isDateTimeHeader(header: string): boolean {
  const lower = header.toLowerCase();
  return lower.includes('time') || lower.includes('datetime') || lower.includes('date_time') || lower.includes('timestamp');
}

export const dateNormalizationScript: IValidationScript = {
  id: 'date-normalization',
  name: 'Date Normalization',
  description: 'Standardizes date fields to MM/DD/YYYY. Date/time fields (with "time" in header) are formatted as DD/MM/YYYY HH:MM for HubSpot.',
  type: 'transform',
  targetFields: ['date'],
  order: 35,

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const errors: ScriptError[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows = rows.map((row) => ({ ...row }));

    // Find date and datetime columns
    const dateHeaders: { header: string; field: string; isDateTime: boolean }[] = [];

    for (const match of headerMatches) {
      if (!match.isMatched || !match.matchedField) continue;

      const fieldName = match.matchedField.hubspotField.toLowerCase();
      const headerLower = match.originalHeader.toLowerCase();

      if (
        fieldName === 'date' ||
        fieldName.includes('date') ||
        headerLower.includes('date') ||
        headerLower.includes('birthday') ||
        headerLower.includes('dob')
      ) {
        dateHeaders.push({
          header: match.originalHeader,
          field: fieldName,
          isDateTime: isDateTimeHeader(match.originalHeader),
        });
      }
    }

    // Also look for unmatched headers that contain "time" as datetime fields
    for (const match of headerMatches) {
      const headerLower = match.originalHeader.toLowerCase();
      if (
        isDateTimeHeader(match.originalHeader) &&
        !dateHeaders.some((d) => d.header === match.originalHeader)
      ) {
        dateHeaders.push({
          header: match.originalHeader,
          field: headerLower,
          isDateTime: true,
        });
      }
    }

    // Fallback: scan row keys for date-like headers not found via headerMatches
    if (rows.length > 0) {
      const rowKeys = Object.keys(rows[0]);
      for (const key of rowKeys) {
        const keyLower = key.toLowerCase().trim();
        if (
          (keyLower.includes('date') || keyLower.includes('birthday') || keyLower.includes('dob')) &&
          !dateHeaders.some((d) => d.header === key)
        ) {
          dateHeaders.push({
            header: key,
            field: keyLower,
            isDateTime: isDateTimeHeader(key),
          });
        }
      }
    }

    if (dateHeaders.length === 0) {
      return { success: true, changes: [], errors: [], warnings: [], modifiedRows: rows };
    }

    for (let i = 0; i < modifiedRows.length; i++) {
      for (const { header, field, isDateTime } of dateHeaders) {
        const value = String(modifiedRows[i][header] || '').trim();
        if (!value) continue;

        if (isDateTime) {
          // Date/time field → DD/MM/YYYY HH:MM
          const parsed = parseDateTime(value);
          if (parsed) {
            if (parsed.formatted !== value) {
              modifiedRows[i][header] = parsed.formatted;
              changes.push({
                rowIndex: i,
                field,
                originalValue: value,
                newValue: parsed.formatted,
                reason: `Converted from ${parsed.format} to DD/MM/YYYY HH:MM`,
              });
            }
          } else {
            // Try parsing as a date and warn that time is missing
            const dateParsed = parseDate(value);
            if (dateParsed) {
              warnings.push({
                rowIndex: i,
                field,
                value,
                warningType: 'missing_time',
                message: `Date/time field "${header}" has no time component`,
              });
            } else {
              errors.push({
                rowIndex: i,
                field,
                value,
                errorType: 'invalid_datetime',
                message: `Could not parse date/time value: "${value}"`,
              });
            }
          }
        } else {
          // Date field → MM/DD/YYYY
          const targetFormat = /^\d{2}\/\d{2}\/\d{4}$/;
          const parsed = parseDate(value);
          if (parsed) {
            const formatted = formatDate(parsed.month, parsed.day, parsed.year);
            if (formatted !== value) {
              modifiedRows[i][header] = formatted;
              changes.push({
                rowIndex: i,
                field,
                originalValue: value,
                newValue: formatted,
                reason: `Converted from ${parsed.format} to MM/DD/YYYY`,
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
