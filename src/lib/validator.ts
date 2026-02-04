import type {
  ParsedRow,
  HeaderMatch,
  ValidationError,
  ValidationResult,
  ScriptRunnerResult,
} from '@/types';
import { runAllScripts, getAvailableScripts } from './scripts';

// Re-export script utilities
export { runAllScripts, getAvailableScripts, runScript } from './scripts';

// Legacy validation function (now uses script system internally)
export function validateData(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  requiredFields: string[]
): ValidationResult {
  // Run all validation scripts
  const scriptResult = runAllScripts(rows, headerMatches, requiredFields);

  // Convert script results to legacy ValidationResult format
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  scriptResult.scriptResults.forEach((result) => {
    result.errors.forEach((err) => {
      errors.push({
        row: err.rowIndex + 1, // Convert to 1-indexed
        field: err.field,
        value: err.value as string | null,
        errorType: err.errorType as ValidationError['errorType'],
        message: err.message,
      });
    });

    result.warnings.forEach((warn) => {
      warnings.push({
        row: warn.rowIndex + 1, // Convert to 1-indexed
        field: warn.field,
        value: warn.value as string | null,
        errorType: warn.warningType as ValidationError['errorType'],
        message: warn.message,
      });
    });
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

// Run validation and return both script results and transformed data
export function validateAndTransform(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  requiredFields: string[],
  enabledScriptIds?: string[]
): {
  validationResult: ValidationResult;
  scriptRunnerResult: ScriptRunnerResult;
  transformedData: ParsedRow[];
} {
  const scriptRunnerResult = runAllScripts(rows, headerMatches, requiredFields, enabledScriptIds);

  // Convert to legacy format
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  scriptRunnerResult.scriptResults.forEach((result) => {
    result.errors.forEach((err) => {
      errors.push({
        row: err.rowIndex + 1,
        field: err.field,
        value: err.value as string | null,
        errorType: err.errorType as ValidationError['errorType'],
        message: err.message,
      });
    });

    result.warnings.forEach((warn) => {
      warnings.push({
        row: warn.rowIndex + 1,
        field: warn.field,
        value: warn.value as string | null,
        errorType: warn.warningType as ValidationError['errorType'],
        message: warn.message,
      });
    });
  });

  const rowsWithErrors = new Set(errors.map((e) => e.row));
  const invalidRows = rowsWithErrors.size;
  const validRows = rows.length - invalidRows;

  const validationResult: ValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
    validRows,
    invalidRows,
  };

  return {
    validationResult,
    scriptRunnerResult,
    transformedData: scriptRunnerResult.processedData,
  };
}

// Transform data to HubSpot-ready format
export function transformToHubSpotFormat(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[]
): ParsedRow[] {
  const headerToHubspot = new Map<string, string>();
  const originalHeaders = new Set<string>();
  headerMatches.forEach((match) => {
    originalHeaders.add(match.originalHeader);
    if (match.matchedField) {
      headerToHubspot.set(match.originalHeader, match.matchedField.hubspotField);
    }
  });

  return rows.map((row) => {
    const transformedRow: ParsedRow = {};

    Object.entries(row).forEach(([header, value]) => {
      const hubspotField = headerToHubspot.get(header);
      if (hubspotField) {
        // Mapped CSV header → HubSpot field name
        transformedRow[hubspotField] = value;
      } else if (!originalHeaders.has(header)) {
        // Not an original CSV header — added by enrichment, already a HubSpot
        // property name. Preserve it so enriched values appear in exports.
        transformedRow[header] = value;
      }
      // Unmapped original CSV headers are dropped — HubSpot rejects unknown field names
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

// Get script-level summary
export function getScriptSummary(result: ScriptRunnerResult): {
  scriptsRun: number;
  totalChanges: number;
  totalErrors: number;
  totalWarnings: number;
  scriptDetails: Array<{
    id: string;
    name: string;
    type: string;
    changes: number;
    errors: number;
    warnings: number;
    timeMs: number;
  }>;
} {
  return {
    scriptsRun: result.scriptsRun,
    totalChanges: result.totalChanges,
    totalErrors: result.totalErrors,
    totalWarnings: result.totalWarnings,
    scriptDetails: result.scriptResults.map((r) => ({
      id: r.scriptId,
      name: r.scriptName,
      type: r.scriptType,
      changes: r.changes.length,
      errors: r.errors.length,
      warnings: r.warnings.length,
      timeMs: Math.round(r.executionTimeMs),
    })),
  };
}
