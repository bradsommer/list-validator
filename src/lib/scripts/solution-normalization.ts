import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

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

    // DEBUG: Log all available headers
    console.log('[SolutionNormalization] headerMatches:', headerMatches.map(m => ({
      original: m.originalHeader,
      matched: m.matchedField?.hubspotField,
      isMatched: m.isMatched
    })));
    if (rows.length > 0) {
      console.log('[SolutionNormalization] Row keys:', Object.keys(rows[0]));
    }

    // Find the solution column — tries headerMatches first, then scans row keys
    const solHeader = findColumnHeader('solution', headerMatches, rows);

    console.log('[SolutionNormalization] Found solHeader:', solHeader);

    if (!solHeader) {
      console.log('[SolutionNormalization] No solution column found - returning unchanged');
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    // DEBUG: Log sample values
    if (rows.length > 0) {
      console.log('[SolutionNormalization] Sample values:', rows.slice(0, 3).map(r => r[solHeader]));
    }

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
