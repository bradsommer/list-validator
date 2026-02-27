import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

// US State abbreviation to full name mapping
const STATE_MAP: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia',
  'PR': 'Puerto Rico',
  'VI': 'Virgin Islands',
  'GU': 'Guam',
  'AS': 'American Samoa',
  'MP': 'Northern Mariana Islands',
};

// Common misspellings and variations
const STATE_VARIANTS: Record<string, string> = {
  'CALI': 'California',
  'CALIF': 'California',
  'CALIFRONIA': 'California',
  'CLAIFORNIA': 'California',
  'NEWYORK': 'New York',
  'NEW YORK CITY': 'New York',
  'NYC': 'New York',
  'TEXS': 'Texas',
  'FLORDA': 'Florida',
  'FLORDIA': 'Florida',
  'GEORIGA': 'Georgia',
  'ILLNOIS': 'Illinois',
  'ILLINIOS': 'Illinois',
  'MASSACHUSETS': 'Massachusetts',
  'MASSACHUSSETTS': 'Massachusetts',
  'MICHGAN': 'Michigan',
  'MINNESOTTA': 'Minnesota',
  'MISSIPPI': 'Mississippi',
  'MISSISIPPI': 'Mississippi',
  'MISOURI': 'Missouri',
  'MISSOURRI': 'Missouri',
  'CONNETICUT': 'Connecticut',
  'CONNECTICUTT': 'Connecticut',
  'PENNSLVANIA': 'Pennsylvania',
  'PENSYLVANIA': 'Pennsylvania',
  'TENNESSE': 'Tennessee',
  'TENNESEE': 'Tennessee',
  'VIRGINA': 'Virginia',
  'WASHINTON': 'Washington',
  'WISCONSON': 'Wisconsin',
  'WISCONSN': 'Wisconsin',
};

// Valid full state names — case-insensitive lookup
const VALID_STATE_NAMES = new Set(Object.values(STATE_MAP));
const VALID_STATE_NAMES_UPPER = new Map(
  Object.values(STATE_MAP).map((name) => [name.toUpperCase(), name])
);

export class StateNormalizationScript implements IValidationScript {
  id = 'state-normalization';
  name = 'State Normalization';
  description = 'Converts state abbreviations (e.g., AL) to full names (e.g., Alabama) and fixes common misspellings';
  type: 'transform' = 'transform';
  targetFields = ['state'];
  order = 10;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find the state column — tries headerMatches first, then scans row keys
    const targetField = context.targetFields?.[0] || 'state';
    const stateHeader = findColumnHeader(targetField, headerMatches, rows);

    if (!stateHeader) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [{
          rowIndex: -1,
          field: 'state',
          value: null,
          warningType: 'column_not_found',
          message: `No "${targetField}" column found in the data — state normalization skipped`,
        }],
        modifiedRows: [...rows],
      };
    }

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[stateHeader];

      if (originalValue === null || originalValue === undefined) {
        modifiedRows.push(newRow);
        return;
      }

      const valueStr = String(originalValue).trim();

      // Skip empty values
      if (!valueStr) {
        modifiedRows.push(newRow);
        return;
      }

      const upperValue = valueStr.toUpperCase();

      // Skip if already a valid full state name (exact match)
      if (VALID_STATE_NAMES.has(valueStr)) {
        modifiedRows.push(newRow);
        return;
      }

      // Check if it's a state abbreviation (e.g., CA → California)
      if (STATE_MAP[upperValue]) {
        const newValue = STATE_MAP[upperValue];
        newRow[stateHeader] = newValue;
        changes.push({
          rowIndex: index,
          field: targetField,
          originalValue,
          newValue,
          reason: `Converted abbreviation "${valueStr}" to full state name`,
        });
      }
      // Check if it's a common misspelling (e.g., CALIFRONIA → California)
      else if (STATE_VARIANTS[upperValue]) {
        const newValue = STATE_VARIANTS[upperValue];
        newRow[stateHeader] = newValue;
        changes.push({
          rowIndex: index,
          field: targetField,
          originalValue,
          newValue,
          reason: `Fixed misspelling "${valueStr}" to "${newValue}"`,
        });
      }
      // Case-insensitive match against valid state names (e.g., california → California)
      else {
        const properCase = VALID_STATE_NAMES_UPPER.get(upperValue);
        if (properCase) {
          newRow[stateHeader] = properCase;
          changes.push({
            rowIndex: index,
            field: targetField,
            originalValue,
            newValue: properCase,
            reason: `Normalized "${valueStr}" to "${properCase}"`,
          });
        } else {
          // Value is not a recognized state — emit a warning
          warnings.push({
            rowIndex: index,
            field: targetField,
            value: originalValue,
            warningType: 'unrecognized_state',
            message: `"${valueStr}" in "${stateHeader}" is not a recognized US state`,
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

export const stateNormalizationScript = new StateNormalizationScript();
