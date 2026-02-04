import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

// Allowed role values (exact match required)
const VALID_ROLES = new Set([
  'Admin',
  'Administrator',
  'Ascend Employee',
  'ATI Champion',
  'ATI Employee',
  'Champion Nominee',
  'Coordinator',
  'Dean',
  'Director',
  'Educator',
  'Instructor',
  'Other',
  'Proctor',
  'Student',
  'TEAS Student',
  'LMS Admin',
]);

// Build a case-insensitive lookup: lowercase → correct casing
const ROLE_LOOKUP = new Map<string, string>();
for (const role of VALID_ROLES) {
  ROLE_LOOKUP.set(role.toLowerCase(), role);
}

export class RoleNormalizationScript implements IValidationScript {
  id = 'role-normalization';
  name = 'Role Normalization';
  description = 'Validates role values against an allowed list. Non-matching values are set to "Other".';
  type: 'transform' = 'transform';
  targetFields = ['role'];
  order = 15;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const modifiedRows: ParsedRow[] = [];

    const roleHeader = findColumnHeader('role', headerMatches, rows);

    if (!roleHeader) {
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
      const originalValue = row[roleHeader];

      if (originalValue !== null && originalValue !== undefined) {
        const valueStr = String(originalValue).trim();

        if (valueStr === '') {
          modifiedRows.push(newRow);
          return;
        }

        // Check for exact match first
        if (VALID_ROLES.has(valueStr)) {
          modifiedRows.push(newRow);
          return;
        }

        // Try case-insensitive match
        const matched = ROLE_LOOKUP.get(valueStr.toLowerCase());
        if (matched) {
          newRow[roleHeader] = matched;
          changes.push({
            rowIndex: index,
            field: 'role',
            originalValue,
            newValue: matched,
            reason: `Fixed casing "${valueStr}" → "${matched}"`,
          });
        } else {
          // No match — set to "Other"
          newRow[roleHeader] = 'Other';
          changes.push({
            rowIndex: index,
            field: 'role',
            originalValue,
            newValue: 'Other',
            reason: `"${valueStr}" is not a valid role — set to "Other"`,
          });
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

export const roleNormalizationScript = new RoleNormalizationScript();
