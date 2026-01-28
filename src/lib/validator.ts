import type {
  ParsedRow,
  FieldMapping,
  HeaderMatch,
  ValidationError,
  ValidationResult
} from '@/types';

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format (basic)
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone);
}

// Check for duplicate emails in the data
function findDuplicateEmails(rows: ParsedRow[], emailField: string): Map<string, number[]> {
  const emailOccurrences = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const email = String(row[emailField] || '').toLowerCase().trim();
    if (email) {
      const existing = emailOccurrences.get(email) || [];
      existing.push(index + 1); // 1-indexed for user display
      emailOccurrences.set(email, existing);
    }
  });

  // Return only duplicates
  const duplicates = new Map<string, number[]>();
  emailOccurrences.forEach((rows, email) => {
    if (rows.length > 1) {
      duplicates.set(email, rows);
    }
  });

  return duplicates;
}

// Main validation function
export function validateData(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  requiredFields: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Create a mapping from original header to hubspot field
  const headerToHubspot = new Map<string, string>();
  headerMatches.forEach((match) => {
    if (match.matchedField) {
      headerToHubspot.set(match.originalHeader, match.matchedField.hubspotField);
    }
  });

  // Find the email field for duplicate checking
  const emailHeader = Array.from(headerToHubspot.entries())
    .find(([_, hubspot]) => hubspot === 'email')?.[0];

  // Check for duplicate emails
  if (emailHeader) {
    const duplicates = findDuplicateEmails(rows, emailHeader);
    duplicates.forEach((rowNumbers, email) => {
      rowNumbers.forEach((rowNum) => {
        warnings.push({
          row: rowNum,
          field: 'email',
          value: email,
          errorType: 'duplicate',
          message: `Duplicate email found in rows: ${rowNumbers.join(', ')}`,
        });
      });
    });
  }

  // Validate each row
  rows.forEach((row, index) => {
    const rowNumber = index + 1; // 1-indexed for user display

    // Check required fields
    requiredFields.forEach((requiredHubspotField) => {
      // Find the original header that maps to this required field
      const originalHeader = Array.from(headerToHubspot.entries())
        .find(([_, hubspot]) => hubspot === requiredHubspotField)?.[0];

      if (!originalHeader) {
        // Required field not mapped
        errors.push({
          row: rowNumber,
          field: requiredHubspotField,
          value: null,
          errorType: 'missing_required',
          message: `Required field '${requiredHubspotField}' is not mapped to any column`,
        });
      } else {
        const value = row[originalHeader];
        if (value === null || value === undefined || String(value).trim() === '') {
          errors.push({
            row: rowNumber,
            field: requiredHubspotField,
            value: null,
            errorType: 'missing_required',
            message: `Required field '${requiredHubspotField}' is empty`,
          });
        }
      }
    });

    // Validate email format if present
    if (emailHeader && row[emailHeader]) {
      const email = String(row[emailHeader]).trim();
      if (email && !isValidEmail(email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          value: email,
          errorType: 'invalid_format',
          message: 'Invalid email format',
        });
      }
    }

    // Validate phone format if present
    const phoneHeader = Array.from(headerToHubspot.entries())
      .find(([_, hubspot]) => hubspot === 'phone')?.[0];

    if (phoneHeader && row[phoneHeader]) {
      const phone = String(row[phoneHeader]).trim();
      if (phone && !isValidPhone(phone)) {
        warnings.push({
          row: rowNumber,
          field: 'phone',
          value: phone,
          errorType: 'invalid_format',
          message: 'Phone number may be incorrectly formatted',
        });
      }
    }
  });

  // Count valid vs invalid rows
  const rowsWithErrors = new Set(errors.map((e) => e.row));
  const invalidRows = rowsWithErrors.size;
  const validRows = rows.length - invalidRows;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validRows,
    invalidRows,
  };
}

// Transform data to HubSpot-ready format
export function transformToHubSpotFormat(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[]
): ParsedRow[] {
  const headerToHubspot = new Map<string, string>();
  headerMatches.forEach((match) => {
    if (match.matchedField) {
      headerToHubspot.set(match.originalHeader, match.matchedField.hubspotField);
    }
  });

  return rows.map((row) => {
    const transformedRow: ParsedRow = {};

    Object.entries(row).forEach(([header, value]) => {
      const hubspotField = headerToHubspot.get(header);
      if (hubspotField) {
        transformedRow[hubspotField] = value;
      } else {
        // Keep unmapped fields with original header
        transformedRow[header] = value;
      }
    });

    return transformedRow;
  });
}

// Get validation summary
export function getValidationSummary(result: ValidationResult): {
  totalErrors: number;
  totalWarnings: number;
  errorsByType: Record<string, number>;
  warningsByType: Record<string, number>;
} {
  const errorsByType: Record<string, number> = {};
  const warningsByType: Record<string, number> = {};

  result.errors.forEach((error) => {
    errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
  });

  result.warnings.forEach((warning) => {
    warningsByType[warning.errorType] = (warningsByType[warning.errorType] || 0) + 1;
  });

  return {
    totalErrors: result.errors.length,
    totalWarnings: result.warnings.length,
    errorsByType,
    warningsByType,
  };
}
