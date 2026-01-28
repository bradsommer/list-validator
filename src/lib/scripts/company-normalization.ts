import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';

// Common company suffixes and their standardized forms
const COMPANY_SUFFIXES: Record<string, string> = {
  'inc': 'Inc.',
  'inc.': 'Inc.',
  'incorporated': 'Inc.',
  'llc': 'LLC',
  'l.l.c.': 'LLC',
  'l.l.c': 'LLC',
  'llp': 'LLP',
  'l.l.p.': 'LLP',
  'ltd': 'Ltd.',
  'ltd.': 'Ltd.',
  'limited': 'Ltd.',
  'corp': 'Corp.',
  'corp.': 'Corp.',
  'corporation': 'Corp.',
  'co': 'Co.',
  'co.': 'Co.',
  'company': 'Co.',
  'plc': 'PLC',
  'p.l.c.': 'PLC',
  'gmbh': 'GmbH',
  'ag': 'AG',
  'sa': 'SA',
  's.a.': 'SA',
  'nv': 'NV',
  'n.v.': 'NV',
  'bv': 'BV',
  'b.v.': 'BV',
  'pty': 'Pty',
  'pty.': 'Pty',
};

// Words that should stay lowercase in company names (unless first word)
const LOWERCASE_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'on', 'at', 'to', 'by']);

// Acronyms that should stay uppercase
const ACRONYMS = new Set([
  'ibm', 'hp', 'att', 'usa', 'uk', 'uae', 'eu', 'ai', 'it', 'hr', 'pr', 'vp', 'ceo', 'cto', 'cfo',
  'api', 'aws', 'gcp', 'saas', 'paas', 'iaas', 'crm', 'erp', 'roi', 'kpi', 'seo', 'sem',
  'b2b', 'b2c', 'd2c', 'iot', 'ml', 'ar', 'vr', 'nft', 'dao', 'defi',
]);

export class CompanyNormalizationScript implements IValidationScript {
  id = 'company-normalization';
  name = 'Company Name Normalization';
  description = 'Standardizes company name formatting, suffixes (Inc., LLC, Ltd.), and common acronyms';
  type: 'transform' = 'transform';
  targetFields = ['company'];
  order = 60;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find the company field
    const companyMatch = headerMatches.find((m) => m.matchedField?.hubspotField === 'company');

    if (!companyMatch) {
      return {
        success: true,
        changes: [],
        errors: [],
        warnings: [],
        modifiedRows: [...rows],
      };
    }

    const companyHeader = companyMatch.originalHeader;

    rows.forEach((row, index) => {
      const newRow = { ...row };
      const originalValue = row[companyHeader];

      if (originalValue === null || originalValue === undefined || String(originalValue).trim() === '') {
        modifiedRows.push(newRow);
        return;
      }

      const valueStr = String(originalValue).trim();
      const result = this.normalizeCompanyName(valueStr);

      if (result.value !== valueStr) {
        newRow[companyHeader] = result.value;
        changes.push({
          rowIndex: index,
          field: 'company',
          originalValue,
          newValue: result.value,
          reason: result.reason,
        });
      }

      if (result.warning) {
        warnings.push({
          rowIndex: index,
          field: 'company',
          value: result.value,
          warningType: result.warning.type,
          message: result.warning.message,
        });
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

  private normalizeCompanyName(
    name: string
  ): { value: string; reason: string; warning?: { type: string; message: string } } {
    let warning: { type: string; message: string } | undefined;
    const reasons: string[] = [];

    // Check for ALL CAPS
    if (name === name.toUpperCase() && name.length > 3 && !ACRONYMS.has(name.toLowerCase())) {
      warning = {
        type: 'all_caps',
        message: `Company name was in ALL CAPS: "${name}"`,
      };
    }

    // Normalize whitespace
    let normalized = name.trim().replace(/\s+/g, ' ');

    // Split into words
    const words = normalized.split(' ');
    const processedWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const lower = word.toLowerCase();

      // Check if it's a company suffix
      if (COMPANY_SUFFIXES[lower]) {
        processedWords.push(COMPANY_SUFFIXES[lower]);
        if (word !== COMPANY_SUFFIXES[lower]) {
          reasons.push(`Standardized suffix "${word}" to "${COMPANY_SUFFIXES[lower]}"`);
        }
        continue;
      }

      // Check if it's an acronym
      if (ACRONYMS.has(lower)) {
        processedWords.push(lower.toUpperCase());
        continue;
      }

      // Check if it's a lowercase word (not first word)
      if (i > 0 && LOWERCASE_WORDS.has(lower)) {
        processedWords.push(lower);
        continue;
      }

      // Title case the word
      processedWords.push(this.titleCase(word));
    }

    const result = processedWords.join(' ');

    // Clean up common issues
    const cleaned = result
      .replace(/\s*,\s*/g, ', ')  // Normalize commas
      .replace(/\s*\.\s*/g, '. ') // Normalize periods
      .replace(/\s+/g, ' ')       // Remove extra spaces
      .trim();

    if (cleaned !== name) {
      if (reasons.length === 0) {
        reasons.push('Normalized capitalization and spacing');
      }
    }

    return {
      value: cleaned,
      reason: reasons.join('; ') || 'No changes needed',
      warning,
    };
  }

  private titleCase(word: string): string {
    if (!word) return word;

    // Handle words with internal capitals (like "iPhone", "eBay")
    if (word.length > 1 && word !== word.toLowerCase() && word !== word.toUpperCase()) {
      // If it has mixed case, preserve it (likely intentional like iPhone)
      return word;
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
}

export const companyNormalizationScript = new CompanyNormalizationScript();
