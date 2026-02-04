import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

// Allowed Program Type values (exact match required)
const VALID_PROGRAM_TYPES = new Set([
  'ADN',
  'BSN',
  'OTHER-BSN',
  'RN',
  'PN',
  'Allied Health',
  'Diploma',
  'Other',
  'Testing Center',
  'ATI Allied Health',
  'RN to BSN',
  'APRN',
  'Healthcare',
  'Bookstore',
  'LPN',
  'DNP',
  'MSN',
  'CNA',
  'ADN - Online',
  'BSN - Online',
  'BSN Philippines',
  'CT',
  'CV Sonography',
  'Dental Assisting',
  'Dental Hygiene',
  'HCO',
  'Health Occupations',
  'Healthcare-ADN',
  'Hospital',
  'ICV',
  'LPN to RN',
  'MRI',
  'Medical Assisting',
  'Medical Sonography',
  'NHA Allied Health',
  'Nuclear Medicine',
  'Occupational Assisting',
  'PN - Online',
  'PhD',
  'Physical Therapy',
  'Radiation Therapy',
  'Radiography',
  'Resident',
  'Respiratory Therapy',
  'Sports Medicine',
  'TEAS Only',
  'Test Program Type',
  'Therapeutic Massage',
]);

// Build a case-insensitive lookup: lowercase → correct casing
const PROGRAM_TYPE_LOOKUP = new Map<string, string>();
for (const pt of VALID_PROGRAM_TYPES) {
  PROGRAM_TYPE_LOOKUP.set(pt.toLowerCase(), pt);
}

export class ProgramTypeNormalizationScript implements IValidationScript {
  id = 'program-type-normalization';
  name = 'Program Type Normalization';
  description = 'Validates Program Type values against an allowed list. Non-matching values are set to "Other". Blank values stay blank.';
  type: 'transform' = 'transform';
  targetFields = ['program_type'];
  order = 16;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find the program type field
    const ptMatch = headerMatches.find(
      (m) => m.matchedField?.hubspotField === 'program_type'
    );

    if (!ptMatch) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    const ptHeader = ptMatch.originalHeader;

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[ptHeader];

      if (originalValue !== null && originalValue !== undefined) {
        const valueStr = String(originalValue).trim();

        if (valueStr === '') {
          modifiedRows.push(newRow);
          return;
        }

        // Check for exact match first
        if (VALID_PROGRAM_TYPES.has(valueStr)) {
          modifiedRows.push(newRow);
          return;
        }

        // Try case-insensitive match
        const matched = PROGRAM_TYPE_LOOKUP.get(valueStr.toLowerCase());
        if (matched) {
          newRow[ptHeader] = matched;
          changes.push({
            rowIndex: index,
            field: 'program_type',
            originalValue,
            newValue: matched,
            reason: `Fixed casing "${valueStr}" → "${matched}"`,
          });
        } else {
          // No match — set to "Other"
          newRow[ptHeader] = 'Other';
          changes.push({
            rowIndex: index,
            field: 'program_type',
            originalValue,
            newValue: 'Other',
            reason: `"${valueStr}" is not a valid Program Type — set to "Other"`,
          });
          warnings.push({
            rowIndex: index,
            field: 'program_type',
            value: originalValue,
            warningType: 'invalid_program_type',
            message: `"${valueStr}" is not a recognized Program Type — set to "Other"`,
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

export const programTypeNormalizationScript = new ProgramTypeNormalizationScript();
