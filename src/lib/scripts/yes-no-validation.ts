import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

// Fields that must be "Yes", "No", or blank
const YES_NO_FIELDS = ['whitespace', 'new_business'];

const VALID_VALUES = new Set(['Yes', 'No', '']);

// Case-insensitive lookup
const VALUE_LOOKUP = new Map<string, string>([
  ['yes', 'Yes'],
  ['no', 'No'],
  ['y', 'Yes'],
  ['n', 'No'],
  ['true', 'Yes'],
  ['false', 'No'],
  ['1', 'Yes'],
  ['0', 'No'],
]);

export class YesNoValidationScript implements IValidationScript {
  id = 'yes-no-validation';
  name = 'Yes/No Field Validation';
  description = 'Ensures "Whitespace" and "New Business" columns contain only "Yes", "No", or blank. Corrects common variants (y/n, true/false, 1/0).';
  type: 'transform' = 'transform';
  targetFields = ['whitespace', 'new_business'];
  order = 12;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find all yes/no fields
    const fieldMatches = headerMatches.filter(
      (m) => m.matchedField && YES_NO_FIELDS.includes(m.matchedField.hubspotField)
    );

    if (fieldMatches.length === 0) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    rows.forEach((row, index) => {
      const newRow = { ...row };

      for (const match of fieldMatches) {
        const header = match.originalHeader;
        const fieldName = match.matchedField!.hubspotField;
        const originalValue = row[header];

        if (originalValue === null || originalValue === undefined) {
          continue;
        }

        const valueStr = String(originalValue).trim();

        // Already valid
        if (VALID_VALUES.has(valueStr)) {
          continue;
        }

        // Try to normalize
        const normalized = VALUE_LOOKUP.get(valueStr.toLowerCase());
        if (normalized) {
          newRow[header] = normalized;
          changes.push({
            rowIndex: index,
            field: fieldName,
            originalValue,
            newValue: normalized,
            reason: `Normalized "${valueStr}" → "${normalized}"`,
          });
        } else {
          // Clear invalid value
          newRow[header] = '';
          changes.push({
            rowIndex: index,
            field: fieldName,
            originalValue,
            newValue: '',
            reason: `"${valueStr}" is not a valid Yes/No value — cleared`,
          });
          warnings.push({
            rowIndex: index,
            field: fieldName,
            value: originalValue,
            warningType: 'invalid_yes_no',
            message: `"${valueStr}" in "${header}" is not Yes/No — value cleared`,
          });
        }
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

export const yesNoValidationScript = new YesNoValidationScript();
