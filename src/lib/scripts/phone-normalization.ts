import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

export class PhoneNormalizationScript implements IValidationScript {
  id = 'phone-normalization';
  name = 'Phone Number Normalization';
  description = 'Standardizes phone numbers to +1XXXXXXXXXX format. Assumes US (+1) when no country code is present.';
  type: 'transform' = 'transform';
  targetFields = ['phone'];
  order = 30;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    const phoneMatch = headerMatches.find(
      (m) => m.matchedField?.hubspotField === 'phone'
    );

    if (!phoneMatch) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    const phoneHeader = phoneMatch.originalHeader;

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[phoneHeader];

      if (originalValue === null || originalValue === undefined || String(originalValue).trim() === '') {
        modifiedRows.push(newRow);
        return;
      }

      const valueStr = String(originalValue).trim();
      const digitsOnly = valueStr.replace(/\D/g, '');

      if (digitsOnly.length < 7) {
        warnings.push({
          rowIndex: index,
          field: 'phone',
          value: valueStr,
          warningType: 'too_short',
          message: `Phone number appears too short: ${digitsOnly.length} digits`,
        });
        modifiedRows.push(newRow);
        return;
      }

      let formatted: string;

      if (digitsOnly.length === 10) {
        // US number without country code — add +1
        formatted = `+1${digitsOnly}`;
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        // US number with leading 1 — format as +1
        formatted = `+${digitsOnly}`;
      } else if (digitsOnly.length > 10 && valueStr.startsWith('+')) {
        // International number with + — keep the + and digits
        formatted = `+${digitsOnly}`;
      } else if (digitsOnly.length > 10) {
        // Longer number without + — might be international, keep as-is with +
        formatted = `+${digitsOnly}`;
        warnings.push({
          rowIndex: index,
          field: 'phone',
          value: valueStr,
          warningType: 'international',
          message: `Phone number may be international (${digitsOnly.length} digits) — verify country code`,
        });
      } else {
        // 7-9 digits — likely missing area code, add +1 anyway
        formatted = `+1${digitsOnly}`;
        warnings.push({
          rowIndex: index,
          field: 'phone',
          value: valueStr,
          warningType: 'missing_area_code',
          message: `Phone number may be missing area code (${digitsOnly.length} digits)`,
        });
      }

      if (formatted !== valueStr) {
        newRow[phoneHeader] = formatted;
        changes.push({
          rowIndex: index,
          field: 'phone',
          originalValue,
          newValue: formatted,
          reason: `Formatted to ${formatted}`,
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

export const phoneNormalizationScript = new PhoneNormalizationScript();
