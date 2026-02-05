import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptWarning } from './types';
import type { ParsedRow } from '@/types';
import { findColumnHeader } from './findColumn';

// Common name prefixes that should stay lowercase
const LOWERCASE_PREFIXES = new Set(['van', 'von', 'de', 'del', 'della', 'di', 'da', 'du', 'la', 'le', 'el']);

// Common suffixes
const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'dds', 'esq']);

// Scottish/Irish prefixes that should be capitalized specially
const SPECIAL_PREFIXES: Record<string, string> = {
  'mc': 'Mc',
  'mac': 'Mac',
  "o'": "O'",
};

export class NameCapitalizationScript implements IValidationScript {
  id = 'name-capitalization';
  name = 'Name Capitalization';
  description = 'Properly capitalizes names, handling special cases like McDonald, O\'Brien, van der Berg';
  type: 'transform' = 'transform';
  targetFields = ['firstname', 'lastname'];
  order = 50;

  execute(context: ScriptContext): ScriptExecutionResult {
    const { rows, headerMatches } = context;
    const changes: ScriptChange[] = [];
    const warnings: ScriptWarning[] = [];
    const modifiedRows: ParsedRow[] = [];

    // Find name fields
    const firstHeader = findColumnHeader('firstname', headerMatches, rows);
    const lastHeader = findColumnHeader('lastname', headerMatches, rows);

    rows.forEach((row, index) => {
      const newRow = { ...row };

      // Process first name
      if (firstHeader) {
        const originalFirst = row[firstHeader];

        if (originalFirst !== null && originalFirst !== undefined && String(originalFirst).trim() !== '') {
          const valueStr = String(originalFirst).trim();
          const result = this.processName(valueStr, 'first');

          if (result.value !== valueStr) {
            newRow[firstHeader] = result.value;
            changes.push({
              rowIndex: index,
              field: 'firstname',
              originalValue: originalFirst,
              newValue: result.value,
              reason: result.reason,
            });
          }

          if (result.warning) {
            warnings.push({
              rowIndex: index,
              field: 'firstname',
              value: result.value,
              warningType: result.warning.type,
              message: result.warning.message,
            });
          }
        }
      }

      // Process last name
      if (lastHeader) {
        const originalLast = row[lastHeader];

        if (originalLast !== null && originalLast !== undefined && String(originalLast).trim() !== '') {
          const valueStr = String(originalLast).trim();
          const result = this.processName(valueStr, 'last');

          if (result.value !== valueStr) {
            newRow[lastHeader] = result.value;
            changes.push({
              rowIndex: index,
              field: 'lastname',
              originalValue: originalLast,
              newValue: result.value,
              reason: result.reason,
            });
          }

          if (result.warning) {
            warnings.push({
              rowIndex: index,
              field: 'lastname',
              value: result.value,
              warningType: result.warning.type,
              message: result.warning.message,
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
      warnings,
      modifiedRows,
    };
  }

  private processName(
    name: string,
    nameType: 'first' | 'last'
  ): { value: string; reason: string; warning?: { type: string; message: string } } {
    const original = name;
    let warning: { type: string; message: string } | undefined;

    // Check if ALL CAPS
    if (name === name.toUpperCase() && name.length > 1) {
      warning = {
        type: 'all_caps',
        message: `Name was in ALL CAPS: "${name}"`,
      };
    }

    // Check if all lowercase
    if (name === name.toLowerCase() && name.length > 1) {
      // This is fine, we'll just capitalize it
    }

    // Trim and normalize spaces
    name = name.trim().replace(/\s+/g, ' ');

    // Handle hyphenated names
    if (name.includes('-')) {
      const parts = name.split('-');
      const capitalizedParts = parts.map((part) => this.capitalizeWord(part.trim(), nameType));
      const result = capitalizedParts.join('-');
      return {
        value: result,
        reason: 'Capitalized hyphenated name parts',
        warning,
      };
    }

    // Handle space-separated names (e.g., "Mary Ann", "van der Berg")
    if (name.includes(' ')) {
      const words = name.split(' ');
      const capitalizedWords = words.map((word, idx) => {
        // For last names, keep certain prefixes lowercase if not first word
        if (nameType === 'last' && idx > 0 && LOWERCASE_PREFIXES.has(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return this.capitalizeWord(word, nameType);
      });
      const result = capitalizedWords.join(' ');
      return {
        value: result,
        reason: 'Capitalized multi-part name',
        warning,
      };
    }

    // Single word name
    const result = this.capitalizeWord(name, nameType);
    return {
      value: result,
      reason: result !== original ? 'Corrected capitalization' : 'No change needed',
      warning,
    };
  }

  private capitalizeWord(word: string, nameType: 'first' | 'last'): string {
    if (!word) return word;

    const lower = word.toLowerCase();

    // Check for suffixes
    if (SUFFIXES.has(lower)) {
      return this.formatSuffix(lower);
    }

    // Check for special prefixes (Mc, Mac, O')
    for (const [prefix, formatted] of Object.entries(SPECIAL_PREFIXES)) {
      if (lower.startsWith(prefix) && lower.length > prefix.length) {
        const rest = word.substring(prefix.length);
        return formatted + this.capitalize(rest);
      }
    }

    // For last names, check lowercase prefixes
    if (nameType === 'last' && LOWERCASE_PREFIXES.has(lower)) {
      return lower;
    }

    // Standard capitalization
    return this.capitalize(word);
  }

  private capitalize(word: string): string {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  private formatSuffix(suffix: string): string {
    const suffixMap: Record<string, string> = {
      'jr': 'Jr.',
      'jr.': 'Jr.',
      'sr': 'Sr.',
      'sr.': 'Sr.',
      'ii': 'II',
      'iii': 'III',
      'iv': 'IV',
      'v': 'V',
      'phd': 'PhD',
      'md': 'MD',
      'dds': 'DDS',
      'esq': 'Esq.',
    };
    return suffixMap[suffix] || suffix;
  }
}

export const nameCapitalizationScript = new NameCapitalizationScript();
