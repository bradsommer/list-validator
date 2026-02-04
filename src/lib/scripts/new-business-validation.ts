import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

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

export class NewBusinessValidationScript implements IValidationScript {
  id = 'new-business-validation';
  name = 'New Business Validation';
  description = 'Ensures "New Business" column contains only "Yes", "No", or blank. Corrects common variants (y/n, true/false, 1/0).';
  type: 'transform' = 'transform';
  targetFields = ['new_business'];
  order = 13;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    const header = findColumnHeader('new_business', headerMatches, rows);

    if (!header) {
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
      const originalValue = row[header];

      if (originalValue === null || originalValue === undefined) {
        modifiedRows.push(newRow);
        return;
      }

      const valueStr = String(originalValue).trim();

      if (VALID_VALUES.has(valueStr)) {
        modifiedRows.push(newRow);
        return;
      }

      const normalized = VALUE_LOOKUP.get(valueStr.toLowerCase());
      if (normalized) {
        newRow[header] = normalized;
        changes.push({
          rowIndex: index,
          field: 'new_business',
          originalValue,
          newValue: normalized,
          reason: `Normalized "${valueStr}" → "${normalized}"`,
        });
      } else {
        newRow[header] = '';
        changes.push({
          rowIndex: index,
          field: 'new_business',
          originalValue,
          newValue: '',
          reason: `"${valueStr}" is not a valid New Business value — cleared`,
        });
        warnings.push({
          rowIndex: index,
          field: 'new_business',
          value: originalValue,
          warningType: 'invalid_new_business',
          message: `"${valueStr}" in "${header}" is not Yes/No — value cleared`,
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

export const newBusinessValidationScript = new NewBusinessValidationScript();
