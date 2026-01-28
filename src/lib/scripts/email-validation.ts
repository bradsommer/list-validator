import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptError, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

// Personal email domains that might need review
const PERSONAL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'zoho.com',
  'ymail.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
]);

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'sharklasers.com',
  'trashmail.com',
]);

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// More strict email regex for validation
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export class EmailValidationScript implements IValidationScript {
  id = 'email-validation';
  name = 'Email Validation';
  description = 'Validates email format, cleans whitespace, and flags personal/disposable email domains';
  type: 'validate' = 'validate';
  targetFields = ['email'];
  order = 20;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches, requiredFields } = context;
    const changes: ScriptChange[] = [];
    const errors: ScriptError[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find the email field
    const emailMatch = headerMatches.find(
      (m) => m.matchedField?.hubspotField === 'email'
    );

    if (!emailMatch) {
      // No email field mapped
      if (requiredFields.includes('email')) {
        errors.push({
          rowIndex: -1,
          field: 'email',
          value: null,
          errorType: 'missing_field',
          message: 'Required email field is not mapped to any column',
        });
      }
      return {
        success: errors.length === 0,
        changes: [],
        errors,
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    const emailHeader = emailMatch.originalHeader;
    const isRequired = requiredFields.includes('email');

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[emailHeader];

      // Handle empty values
      if (originalValue === null || originalValue === undefined || String(originalValue).trim() === '') {
        if (isRequired) {
          errors.push({
            rowIndex: index,
            field: 'email',
            value: originalValue,
            errorType: 'missing_required',
            message: 'Required email field is empty',
          });
        }
        modifiedRows.push(newRow);
        return;
      }

      let email = String(originalValue).trim().toLowerCase();

      // Track if we made changes
      if (email !== String(originalValue)) {
        changes.push({
          rowIndex: index,
          field: 'email',
          originalValue,
          newValue: email,
          reason: 'Trimmed whitespace and converted to lowercase',
        });
        newRow[emailHeader] = email;
      }

      // Basic format validation
      if (!EMAIL_REGEX.test(email)) {
        errors.push({
          rowIndex: index,
          field: 'email',
          value: email,
          errorType: 'invalid_format',
          message: 'Invalid email format',
        });
        modifiedRows.push(newRow);
        return;
      }

      // Strict format validation
      if (!STRICT_EMAIL_REGEX.test(email)) {
        warnings.push({
          rowIndex: index,
          field: 'email',
          value: email,
          warningType: 'suspicious_format',
          message: 'Email format may have issues (unusual characters)',
        });
      }

      // Extract domain
      const domain = email.split('@')[1];

      // Check for disposable domains
      if (DISPOSABLE_DOMAINS.has(domain)) {
        errors.push({
          rowIndex: index,
          field: 'email',
          value: email,
          errorType: 'disposable_email',
          message: `Disposable email domain detected: ${domain}`,
        });
      }

      // Warn about personal email domains
      if (PERSONAL_DOMAINS.has(domain)) {
        warnings.push({
          rowIndex: index,
          field: 'email',
          value: email,
          warningType: 'personal_email',
          message: `Personal email domain: ${domain} - consider using business email`,
        });
      }

      // Check for common typos in domains
      const suggestedDomain = this.checkDomainTypos(domain);
      if (suggestedDomain) {
        warnings.push({
          rowIndex: index,
          field: 'email',
          value: email,
          warningType: 'possible_typo',
          message: `Possible typo in domain: "${domain}" - did you mean "${suggestedDomain}"?`,
        });
      }

      modifiedRows.push(newRow);
    });

    return {
      success: errors.length === 0,
      changes,
      errors,
      warnings,
      modifiedRows,
    };
  }

  private checkDomainTypos(domain: string): string | null {
    const typoMap: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'gmail.con': 'gmail.com',
      'gmail.co': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'yahoo.con': 'yahoo.com',
      'hotmal.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmail.con': 'hotmail.com',
      'outloo.com': 'outlook.com',
      'outlok.com': 'outlook.com',
      'outlook.con': 'outlook.com',
    };

    return typoMap[domain] || null;
  }
}

export const emailValidationScript = new EmailValidationScript();
