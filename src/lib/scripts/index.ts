import type { ParsedRow, HeaderMatch, ScriptResult, ScriptRunnerResult, ValidationScript } from '@/types';
import type { IValidationScript, ScriptContext } from './types';

// Import all scripts
import { stateNormalizationScript } from './state-normalization';
import { emailValidationScript } from './email-validation';
import { phoneNormalizationScript } from './phone-normalization';
import { dateNormalizationScript } from './date-normalization';
import { duplicateDetectionScript } from './duplicate-detection';
import { nameCapitalizationScript } from './name-capitalization';
import { companyNormalizationScript } from './company-normalization';
import { roleNormalizationScript } from './role-normalization';
import { yesNoValidationScript } from './yes-no-validation';
import { programTypeNormalizationScript } from './program-type-normalization';

// Registry of all available scripts (ordered by execution order)
const ALL_SCRIPTS: IValidationScript[] = [
  stateNormalizationScript,            // order: 10
  yesNoValidationScript,               // order: 12
  roleNormalizationScript,             // order: 15
  programTypeNormalizationScript,      // order: 16
  emailValidationScript,               // order: 20
  phoneNormalizationScript,            // order: 30
  dateNormalizationScript,             // order: 35
  nameCapitalizationScript,            // order: 50
  companyNormalizationScript,          // order: 60
  duplicateDetectionScript,            // order: 100 - run last
].sort((a, b) => a.order - b.order);

// Get list of all available scripts (for UI display)
export function getAvailableScripts(): ValidationScript[] {
  return ALL_SCRIPTS.map((script) => ({
    id: script.id,
    name: script.name,
    description: script.description,
    type: script.type,
    targetFields: script.targetFields,
    isEnabled: true,
    order: script.order,
  }));
}

// Run a single script
export function runScript(
  scriptId: string,
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  requiredFields: string[]
): ScriptResult {
  const startTime = performance.now();
  const script = ALL_SCRIPTS.find((s) => s.id === scriptId);

  if (!script) {
    return {
      scriptId,
      scriptName: 'Unknown Script',
      scriptType: 'validate',
      success: false,
      changes: [],
      errors: [
        {
          rowIndex: -1,
          field: '',
          value: null,
          errorType: 'script_not_found',
          message: `Script with ID "${scriptId}" not found`,
        },
      ],
      warnings: [],
      rowsProcessed: 0,
      rowsModified: 0,
      executionTimeMs: 0,
    };
  }

  const context: ScriptContext = {
    rows,
    headerMatches,
    requiredFields,
  };

  const result = script.execute(context);
  const executionTimeMs = performance.now() - startTime;

  return {
    scriptId: script.id,
    scriptName: script.name,
    scriptType: script.type,
    success: result.success,
    changes: result.changes,
    errors: result.errors,
    warnings: result.warnings,
    rowsProcessed: rows.length,
    rowsModified: result.changes.length > 0 ? new Set(result.changes.map((c) => c.rowIndex)).size : 0,
    executionTimeMs,
  };
}

// Run all enabled scripts in order
export function runAllScripts(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  requiredFields: string[],
  enabledScriptIds?: string[]
): ScriptRunnerResult {
  const scriptsToRun = enabledScriptIds
    ? ALL_SCRIPTS.filter((s) => enabledScriptIds.includes(s.id))
    : ALL_SCRIPTS;

  const scriptResults: ScriptResult[] = [];
  let currentRows = [...rows];
  let totalChanges = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const script of scriptsToRun) {
    const startTime = performance.now();

    const context: ScriptContext = {
      rows: currentRows,
      headerMatches,
      requiredFields,
    };

    const result = script.execute(context);
    const executionTimeMs = performance.now() - startTime;

    const scriptResult: ScriptResult = {
      scriptId: script.id,
      scriptName: script.name,
      scriptType: script.type,
      success: result.success,
      changes: result.changes,
      errors: result.errors,
      warnings: result.warnings,
      rowsProcessed: currentRows.length,
      rowsModified: result.changes.length > 0 ? new Set(result.changes.map((c) => c.rowIndex)).size : 0,
      executionTimeMs,
    };

    scriptResults.push(scriptResult);
    totalChanges += result.changes.length;
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    // Use modified rows for next script (transform scripts modify data)
    if (script.type === 'transform') {
      currentRows = result.modifiedRows;
    }
  }

  return {
    totalScripts: ALL_SCRIPTS.length,
    scriptsRun: scriptsToRun.length,
    scriptResults,
    totalChanges,
    totalErrors,
    totalWarnings,
    processedData: currentRows,
  };
}

// Export individual scripts for direct access if needed
export {
  stateNormalizationScript,
  yesNoValidationScript,
  roleNormalizationScript,
  programTypeNormalizationScript,
  emailValidationScript,
  phoneNormalizationScript,
  dateNormalizationScript,
  duplicateDetectionScript,
  nameCapitalizationScript,
  companyNormalizationScript,
};

// Export types
export type { IValidationScript, ScriptContext, ScriptExecutionResult } from './types';
