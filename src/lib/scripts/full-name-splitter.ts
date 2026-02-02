import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';

// Splits a "Full Name" or "Name" column into firstname and lastname
export const fullNameSplitterScript: IValidationScript = {
  id: 'full-name-splitter',
  name: 'Full Name Splitter',
  description: 'Splits combined name fields (e.g., "John Smith") into separate first and last name fields',
  type: 'transform',
  targetFields: ['firstname', 'lastname'],
  order: 5, // Run early, before name capitalization

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows = rows.map((row) => ({ ...row }));

    // Find columns that might contain full names
    const nameHeaders: string[] = [];
    const firstNameHeader = headerMatches.find(
      (m) => m.isMatched && m.matchedField?.hubspotField === 'firstname'
    );
    const lastNameHeader = headerMatches.find(
      (m) => m.isMatched && m.matchedField?.hubspotField === 'lastname'
    );

    // Look for unmatched headers that look like full name columns
    for (const match of headerMatches) {
      const lower = match.originalHeader.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
      if (
        lower === 'full name' ||
        lower === 'fullname' ||
        lower === 'name' ||
        lower === 'contact name' ||
        lower === 'contactname' ||
        lower === 'person name' ||
        lower === 'client name' ||
        lower === 'customer name'
      ) {
        nameHeaders.push(match.originalHeader);
      }
    }

    // If there's no full name column, or both first and last name are already populated, skip
    if (nameHeaders.length === 0) {
      return { success: true, changes: [], errors: [], warnings: [], modifiedRows: rows };
    }

    const nameHeader = nameHeaders[0];

    for (let i = 0; i < modifiedRows.length; i++) {
      const fullName = String(modifiedRows[i][nameHeader] || '').trim();
      if (!fullName) continue;

      // Check if first/last name fields already have values
      const existingFirst = firstNameHeader
        ? String(modifiedRows[i][firstNameHeader.originalHeader] || '').trim()
        : '';
      const existingLast = lastNameHeader
        ? String(modifiedRows[i][lastNameHeader.originalHeader] || '').trim()
        : '';

      // Only split if first OR last name is empty
      if (existingFirst && existingLast) continue;

      const parts = fullName.split(/\s+/);

      if (parts.length === 1) {
        // Single name - put in first name
        if (!existingFirst && firstNameHeader) {
          modifiedRows[i][firstNameHeader.originalHeader] = parts[0];
          changes.push({
            rowIndex: i,
            field: 'firstname',
            originalValue: existingFirst || null,
            newValue: parts[0],
            reason: `Split from "${nameHeader}": "${fullName}"`,
          });
        }
        warnings.push({
          rowIndex: i,
          field: nameHeader,
          value: fullName,
          warningType: 'single_name',
          message: `Only one name found in "${nameHeader}" - placed in First Name`,
        });
      } else if (parts.length === 2) {
        // Standard "First Last"
        if (!existingFirst && firstNameHeader) {
          modifiedRows[i][firstNameHeader.originalHeader] = parts[0];
          changes.push({
            rowIndex: i,
            field: 'firstname',
            originalValue: existingFirst || null,
            newValue: parts[0],
            reason: `Split from "${nameHeader}": "${fullName}"`,
          });
        }
        if (!existingLast && lastNameHeader) {
          modifiedRows[i][lastNameHeader.originalHeader] = parts[1];
          changes.push({
            rowIndex: i,
            field: 'lastname',
            originalValue: existingLast || null,
            newValue: parts[1],
            reason: `Split from "${nameHeader}": "${fullName}"`,
          });
        }
      } else if (parts.length === 3) {
        // Handle "First Middle Last" or "First Last Jr/Sr/III"
        const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v'];
        const lastPart = parts[2].toLowerCase().replace('.', '');

        if (suffixes.includes(lastPart)) {
          // "First Last Jr." - combine last + suffix
          if (!existingFirst && firstNameHeader) {
            modifiedRows[i][firstNameHeader.originalHeader] = parts[0];
            changes.push({
              rowIndex: i,
              field: 'firstname',
              originalValue: existingFirst || null,
              newValue: parts[0],
              reason: `Split from "${nameHeader}": "${fullName}"`,
            });
          }
          if (!existingLast && lastNameHeader) {
            const lastName = `${parts[1]} ${parts[2]}`;
            modifiedRows[i][lastNameHeader.originalHeader] = lastName;
            changes.push({
              rowIndex: i,
              field: 'lastname',
              originalValue: existingLast || null,
              newValue: lastName,
              reason: `Split from "${nameHeader}": "${fullName}" (with suffix)`,
            });
          }
        } else {
          // "First Middle Last" - use first and last
          if (!existingFirst && firstNameHeader) {
            modifiedRows[i][firstNameHeader.originalHeader] = parts[0];
            changes.push({
              rowIndex: i,
              field: 'firstname',
              originalValue: existingFirst || null,
              newValue: parts[0],
              reason: `Split from "${nameHeader}": "${fullName}" (middle name dropped)`,
            });
          }
          if (!existingLast && lastNameHeader) {
            modifiedRows[i][lastNameHeader.originalHeader] = parts[parts.length - 1];
            changes.push({
              rowIndex: i,
              field: 'lastname',
              originalValue: existingLast || null,
              newValue: parts[parts.length - 1],
              reason: `Split from "${nameHeader}": "${fullName}" (middle name dropped)`,
            });
          }
        }
      } else {
        // 4+ parts - take first and last
        if (!existingFirst && firstNameHeader) {
          modifiedRows[i][firstNameHeader.originalHeader] = parts[0];
          changes.push({
            rowIndex: i,
            field: 'firstname',
            originalValue: existingFirst || null,
            newValue: parts[0],
            reason: `Split from "${nameHeader}": "${fullName}"`,
          });
        }
        if (!existingLast && lastNameHeader) {
          modifiedRows[i][lastNameHeader.originalHeader] = parts[parts.length - 1];
          changes.push({
            rowIndex: i,
            field: 'lastname',
            originalValue: existingLast || null,
            newValue: parts[parts.length - 1],
            reason: `Split from "${nameHeader}": "${fullName}"`,
          });
        }
      }
    }

    return {
      success: true,
      changes,
      errors: [],
      warnings,
      modifiedRows,
    };
  },
};
