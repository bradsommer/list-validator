import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

const VALID_SOLUTIONS = new Set([
  'OPTIMAL',
  'SUPREME',
  'STO',
  'CARP',
  'BASIC',
  'MID-MARKET',
  'COMPLETE',
]);

// Case-insensitive lookup: uppercase → correct value
const SOLUTION_LOOKUP = new Map<string, string>();
for (const s of VALID_SOLUTIONS) {
  SOLUTION_LOOKUP.set(s.toUpperCase(), s);
}

export class SolutionNormalizationScript implements IValidationScript {
  id = 'solution-normalization';
  name = 'Solution Normalization';
  description = 'Validates Solution values against an allowed list. Fixes casing mismatches; non-matching values are set to "Other".';
  type: 'transform' = 'transform';
  targetFields = ['solution'];
  order = 17;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    const solMatch = headerMatches.find(
      (m) => m.matchedField?.hubspotField === 'solution'
    );

    if (!solMatch) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    const solHeader = solMatch.originalHeader;

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[solHeader];

      if (originalValue !== null && originalValue !== undefined) {
        const valueStr = String(originalValue).trim();

        if (valueStr === '') {
          modifiedRows.push(newRow);
          return;
        }

        // Exact match
        if (VALID_SOLUTIONS.has(valueStr)) {
          modifiedRows.push(newRow);
          return;
        }

        // Case-insensitive match
        const matched = SOLUTION_LOOKUP.get(valueStr.toUpperCase());
        if (matched) {
          newRow[solHeader] = matched;
          changes.push({
            rowIndex: index,
            field: 'solution',
            originalValue,
            newValue: matched,
            reason: `Fixed casing "${valueStr}" → "${matched}"`,
          });
        } else {
          // Non-matching — set to "Other"
          newRow[solHeader] = 'Other';
          changes.push({
            rowIndex: index,
            field: 'solution',
            originalValue,
            newValue: 'Other',
            reason: `"${valueStr}" is not a valid Solution — set to "Other"`,
          });
          warnings.push({
            rowIndex: index,
            field: 'solution',
            value: originalValue,
            warningType: 'invalid_solution',
            message: `"${valueStr}" is not a recognized Solution value — set to "Other"`,
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

export const solutionNormalizationScript = new SolutionNormalizationScript();
