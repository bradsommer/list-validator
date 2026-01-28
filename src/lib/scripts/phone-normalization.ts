import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

// Phone number validation regex (7+ digits with optional formatting)
const PHONE_REGEX = /^[\d\s\-\+\(\)\.]{7,}$/;

// US phone format: (XXX) XXX-XXXX or +1 (XXX) XXX-XXXX
const US_PHONE_REGEX = /^(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

export class PhoneNormalizationScript implements IValidationScript {
  id = 'phone-normalization';
  name = 'Phone Number Normalization';
  description = 'Standardizes phone number formats to (XXX) XXX-XXXX and validates phone number structure';
  type: 'transform' = 'transform';
  targetFields = ['phone'];
  order = 30;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find the phone field
    const phoneMatch = headerMatches.find(
      (m) => m.matchedField?.hubspotField === 'phone'
    );

    if (!phoneMatch) {
      // No phone field mapped, nothing to do
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

      // Skip empty values
      if (originalValue === null || originalValue === undefined || String(originalValue).trim() === '') {
        modifiedRows.push(newRow);
        return;
      }

      const valueStr = String(originalValue).trim();

      // Extract just the digits
      const digitsOnly = valueStr.replace(/\D/g, '');

      // Basic validation - must have at least 7 digits
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

      // Handle US phone numbers
      if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'))) {
        const normalized = this.formatUSPhone(digitsOnly);
        if (normalized !== valueStr) {
          newRow[phoneHeader] = normalized;
          changes.push({
            rowIndex: index,
            field: 'phone',
            originalValue,
            newValue: normalized,
            reason: `Standardized to US phone format`,
          });
        }
      }
      // Handle international numbers
      else if (digitsOnly.length > 10) {
        const normalized = this.formatInternationalPhone(valueStr, digitsOnly);
        if (normalized !== valueStr) {
          newRow[phoneHeader] = normalized;
          changes.push({
            rowIndex: index,
            field: 'phone',
            originalValue,
            newValue: normalized,
            reason: `Cleaned up international phone format`,
          });
        }

        // Warn if it might be an issue
        if (digitsOnly.length > 15) {
          warnings.push({
            rowIndex: index,
            field: 'phone',
            value: normalized,
            warningType: 'too_long',
            message: `Phone number has ${digitsOnly.length} digits (unusually long)`,
          });
        }
      }
      // 7-9 digits (local numbers without area code)
      else {
        warnings.push({
          rowIndex: index,
          field: 'phone',
          value: valueStr,
          warningType: 'missing_area_code',
          message: `Phone number may be missing area code (${digitsOnly.length} digits)`,
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

  private formatUSPhone(digits: string): string {
    // Remove leading 1 if present
    const cleanDigits = digits.startsWith('1') && digits.length === 11
      ? digits.substring(1)
      : digits;

    if (cleanDigits.length !== 10) {
      return digits; // Can't format, return as-is
    }

    const areaCode = cleanDigits.substring(0, 3);
    const exchange = cleanDigits.substring(3, 6);
    const subscriber = cleanDigits.substring(6, 10);

    return `(${areaCode}) ${exchange}-${subscriber}`;
  }

  private formatInternationalPhone(original: string, digits: string): string {
    // If it already has a + at the start, clean it up
    if (original.startsWith('+')) {
      // Format as +X XXX XXX XXXX (spaced for readability)
      return '+' + digits.replace(/(\d{1,3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4').trim();
    }

    // Otherwise, just clean up any double spaces/dashes
    return original
      .replace(/\s+/g, ' ')
      .replace(/-+/g, '-')
      .replace(/\.+/g, '.')
      .trim();
  }
}

export const phoneNormalizationScript = new PhoneNormalizationScript();
