import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

// Valid region values
const VALID_REGIONS = new Set([
  'Global',
  'Great Lakes',
  'Northeast',
  'National',
  'Other',
  'South',
  'West',
]);

// Case-insensitive lookup
const REGION_LOOKUP = new Map<string, string>();
for (const region of Array.from(VALID_REGIONS)) {
  REGION_LOOKUP.set(region.toLowerCase(), region);
}

// Common variations / aliases
const REGION_ALIASES = new Map<string, string>([
  ['greatlakes', 'Great Lakes'],
  ['great lakes', 'Great Lakes'],
  ['great-lakes', 'Great Lakes'],
  ['ne', 'Northeast'],
  ['north east', 'Northeast'],
  ['north-east', 'Northeast'],
  ['sw', 'South'],
  ['southeast', 'South'],
  ['south east', 'South'],
  ['south-east', 'South'],
  ['southwest', 'South'],
  ['south west', 'South'],
  ['south-west', 'South'],
  ['nw', 'West'],
  ['northwest', 'West'],
  ['north west', 'West'],
  ['north-west', 'West'],
  ['intl', 'Global'],
  ['international', 'Global'],
  ['nationwide', 'National'],
  ['nat', 'National'],
  ['natl', 'National'],
]);

export class RegionNormalizationScript implements IValidationScript {
  id = 'region-normalization';
  name = 'Region Normalization';
  description = 'Normalizes region values to: Global, Great Lakes, Northeast, National, Other, South, West. Non-matching values are set to "Other".';
  type: 'transform' = 'transform';
  targetFields = ['region'];
  order = 18;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    const targetField = context.targetFields?.[0] || 'region';
    const regionHeader = findColumnHeader(targetField, headerMatches, rows);

    if (!regionHeader) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [{
          rowIndex: -1,
          field: 'region',
          value: null,
          warningType: 'column_not_found',
          message: `No "${targetField}" column found in the data — region normalization skipped`,
        }],
        modifiedRows: [...rows],
      };
    }

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[regionHeader];

      if (originalValue === null || originalValue === undefined) {
        modifiedRows.push(newRow);
        return;
      }

      const valueStr = String(originalValue).trim();

      if (!valueStr) {
        modifiedRows.push(newRow);
        return;
      }

      // Already a valid region (exact match)
      if (VALID_REGIONS.has(valueStr)) {
        modifiedRows.push(newRow);
        return;
      }

      const lowerValue = valueStr.toLowerCase();

      // Case-insensitive match against valid regions
      const caseMatch = REGION_LOOKUP.get(lowerValue);
      if (caseMatch) {
        newRow[regionHeader] = caseMatch;
        changes.push({
          rowIndex: index,
          field: targetField,
          originalValue,
          newValue: caseMatch,
          reason: `Fixed casing "${valueStr}" → "${caseMatch}"`,
        });
        modifiedRows.push(newRow);
        return;
      }

      // Check aliases
      const aliasMatch = REGION_ALIASES.get(lowerValue);
      if (aliasMatch) {
        newRow[regionHeader] = aliasMatch;
        changes.push({
          rowIndex: index,
          field: targetField,
          originalValue,
          newValue: aliasMatch,
          reason: `Normalized "${valueStr}" → "${aliasMatch}"`,
        });
        modifiedRows.push(newRow);
        return;
      }

      // No match — set to "Other" and warn
      newRow[regionHeader] = 'Other';
      changes.push({
        rowIndex: index,
        field: targetField,
        originalValue,
        newValue: 'Other',
        reason: `"${valueStr}" is not a valid region — set to "Other"`,
      });
      warnings.push({
        rowIndex: index,
        field: targetField,
        value: originalValue,
        warningType: 'unrecognized_region',
        message: `"${valueStr}" in "${regionHeader}" is not a recognized region — set to "Other"`,
      });

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

export const regionNormalizationScript = new RegionNormalizationScript();
