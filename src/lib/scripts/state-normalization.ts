import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange } from './types';
import type { ParsedRow } from '@/types';

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

// Valid full state names (for checking if already correct)
const VALID_STATE_NAMES = new Set(Object.values(STATE_MAP));

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
    const modifiedRows: ParsedRow[] = [];

    // Find the state field
    const stateMatch = headerMatches.find(
      (m) => m.matchedField?.hubspotField === 'state'
    );

    if (!stateMatch) {
      // No state field mapped, nothing to do
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    const stateHeader = stateMatch.originalHeader;

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[stateHeader];

      if (originalValue !== null && originalValue !== undefined) {
        const valueStr = String(originalValue).trim();
        const upperValue = valueStr.toUpperCase();

        // Skip if already a valid full state name
        if (VALID_STATE_NAMES.has(valueStr)) {
          modifiedRows.push(newRow);
          return;
        }

        // Check if it's a state abbreviation
        if (STATE_MAP[upperValue]) {
          const newValue = STATE_MAP[upperValue];
          newRow[stateHeader] = newValue;
          changes.push({
            rowIndex: index,
            field: 'state',
            originalValue,
            newValue,
            reason: `Converted abbreviation "${valueStr}" to full state name`,
          });
        }
        // Check if it's a common misspelling
        else if (STATE_VARIANTS[upperValue]) {
          const newValue = STATE_VARIANTS[upperValue];
          newRow[stateHeader] = newValue;
          changes.push({
            rowIndex: index,
            field: 'state',
            originalValue,
            newValue,
            reason: `Fixed misspelling "${valueStr}" to "${newValue}"`,
          });
        }
        // Check if it's a misspelling with minor variations
        else {
          const normalized = this.fuzzyMatchState(valueStr);
          if (normalized && normalized !== valueStr) {
            newRow[stateHeader] = normalized;
            changes.push({
              rowIndex: index,
              field: 'state',
              originalValue,
              newValue: normalized,
              reason: `Normalized "${valueStr}" to "${normalized}"`,
            });
          }
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

  private fuzzyMatchState(value: string): string | null {
    const normalized = value.trim();
    const upper = normalized.toUpperCase();

    // Try to match against full state names (case-insensitive)
    for (const stateName of VALID_STATE_NAMES) {
      if (stateName.toUpperCase() === upper) {
        return stateName;
      }
    }

    return null;
  }
}

export const stateNormalizationScript = new StateNormalizationScript();
