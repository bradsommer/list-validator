import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

export class DuplicateDetectionScript implements IValidationScript {
  id = 'duplicate-detection';
  name = 'Duplicate Detection';
  description = 'Identifies duplicate entries based on email, name combinations, or phone numbers';
  type: 'validate' = 'validate';
  targetFields = ['email', 'firstname', 'lastname', 'phone'];
  order = 40;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const warnings: ScriptWarning[] = [];
    const modifiedRows = [...rows];

    // Find relevant fields
    const emailHeader = findColumnHeader('email', headerMatches, rows);
    const firstHeader = findColumnHeader('firstname', headerMatches, rows);
    const lastHeader = findColumnHeader('lastname', headerMatches, rows);
    const phoneHeader = findColumnHeader('phone', headerMatches, rows);

    // Check for email duplicates
    if (emailHeader) {
      const emailOccurrences = new Map<string, number[]>();

      rows.forEach((row, index) => {
        const email = String(row[emailHeader] || '').toLowerCase().trim();
        if (email) {
          const existing = emailOccurrences.get(email) || [];
          existing.push(index);
          emailOccurrences.set(email, existing);
        }
      });

      emailOccurrences.forEach((indices, email) => {
        if (indices.length > 1) {
          indices.forEach((idx) => {
            warnings.push({
              rowIndex: idx,
              field: 'email',
              value: email,
              warningType: 'duplicate_email',
              message: `Duplicate email found in rows: ${indices.map((i) => i + 1).join(', ')}`,
            });
          });
        }
      });
    }

    // Check for name duplicates (first + last)
    if (firstHeader && lastHeader) {
      const nameOccurrences = new Map<string, number[]>();

      rows.forEach((row, index) => {
        const firstName = String(row[firstHeader] || '').toLowerCase().trim();
        const lastName = String(row[lastHeader] || '').toLowerCase().trim();

        if (firstName && lastName) {
          const fullName = `${firstName}|${lastName}`;
          const existing = nameOccurrences.get(fullName) || [];
          existing.push(index);
          nameOccurrences.set(fullName, existing);
        }
      });

      nameOccurrences.forEach((indices, nameParts) => {
        if (indices.length > 1) {
          const [firstName, lastName] = nameParts.split('|');
          indices.forEach((idx) => {
            // Only warn if different emails (same email duplicates already flagged)
            const rowEmails = indices.map((i) =>
              emailHeader ? String(rows[i][emailHeader] || '').toLowerCase().trim() : ''
            );
            const uniqueEmails = new Set(rowEmails.filter((e) => e));

            if (uniqueEmails.size > 1 || !emailHeader) {
              warnings.push({
                rowIndex: idx,
                field: 'name',
                value: `${firstName} ${lastName}`,
                warningType: 'duplicate_name',
                message: `Same name "${firstName} ${lastName}" appears in rows: ${indices.map((i) => i + 1).join(', ')} (different emails)`,
              });
            }
          });
        }
      });
    }

    // Check for phone duplicates
    if (phoneHeader) {
      const phoneOccurrences = new Map<string, number[]>();

      rows.forEach((row, index) => {
        const phone = String(row[phoneHeader] || '').replace(/\D/g, ''); // Normalize to digits only
        if (phone && phone.length >= 7) {
          const existing = phoneOccurrences.get(phone) || [];
          existing.push(index);
          phoneOccurrences.set(phone, existing);
        }
      });

      phoneOccurrences.forEach((indices, phone) => {
        if (indices.length > 1) {
          indices.forEach((idx) => {
            warnings.push({
              rowIndex: idx,
              field: 'phone',
              value: phone,
              warningType: 'duplicate_phone',
              message: `Duplicate phone number found in rows: ${indices.map((i) => i + 1).join(', ')}`,
            });
          });
        }
      });
    }

    return {
      success: true,
      changes: [],
      errors: [],
      warnings,
      modifiedRows,
    };
  }
}

export const duplicateDetectionScript = new DuplicateDetectionScript();
