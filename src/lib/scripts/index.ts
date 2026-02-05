import type { ParsedRow, HeaderMatch, ScriptResult, ScriptRunnerResult, ValidationScript } from '@/types';
import type { IValidationScript, ScriptContext, ScriptExecutionResult, ScriptChange, ScriptError, ScriptWarning } from './types';
import type { AccountRule } from '@/lib/accountRules';

// Import all scripts
import { stateNormalizationScript } from './state-normalization';
import { emailValidationScript } from './email-validation';
import { phoneNormalizationScript } from './phone-normalization';
import { dateNormalizationScript } from './date-normalization';
import { duplicateDetectionScript } from './duplicate-detection';
import { nameCapitalizationScript } from './name-capitalization';
import { companyNormalizationScript } from './company-normalization';
import { roleNormalizationScript } from './role-normalization';
import { whitespaceValidationScript } from './whitespace-validation';
import { newBusinessValidationScript } from './new-business-validation';
import { programTypeNormalizationScript } from './program-type-normalization';
import { solutionNormalizationScript } from './solution-normalization';

// Registry of all available scripts (ordered by execution order)
const ALL_SCRIPTS: IValidationScript[] = [
  stateNormalizationScript,            // order: 10
  whitespaceValidationScript,          // order: 12
  newBusinessValidationScript,         // order: 13
  roleNormalizationScript,             // order: 15
  programTypeNormalizationScript,      // order: 16
  solutionNormalizationScript,         // order: 17
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
  whitespaceValidationScript,
  newBusinessValidationScript,
  roleNormalizationScript,
  programTypeNormalizationScript,
  solutionNormalizationScript,
  emailValidationScript,
  phoneNormalizationScript,
  dateNormalizationScript,
  duplicateDetectionScript,
  nameCapitalizationScript,
  companyNormalizationScript,
};

// Create a dynamic script from a database rule with custom code
export function createDynamicScript(rule: AccountRule): IValidationScript | null {
  const code = rule.config?.code as string;
  if (!code) return null;

  return {
    id: rule.ruleId,
    name: rule.name,
    description: rule.description || '',
    type: rule.ruleType,
    targetFields: rule.targetFields,
    order: rule.displayOrder,
    execute(context: ScriptContext): ScriptExecutionResult {
      const { rows, headerMatches } = context;
      const changes: ScriptChange[] = [];
      const errors: ScriptError[] = [];
      const warnings: ScriptWarning[] = [];
      const modifiedRows = rows.map((row) => ({ ...row }));

      // Find which columns match the target fields
      const targetMatches = headerMatches.filter(
        (match) => match.matchedField && rule.targetFields.includes(match.matchedField.hubspotField)
      );

      if (targetMatches.length === 0) {
        return { success: true, changes, errors, warnings, modifiedRows };
      }

      try {
        // Parse the user's code to extract the function
        let userFunction: ((value: unknown, fieldName: string, row: Record<string, unknown>) => unknown) | null = null;

        // Try to extract and create the function from the code
        // The code should define either a 'transform' or 'validate' function
        const functionMatch = code.match(/function\s+(transform|validate)\s*\([^)]*\)\s*\{/);
        if (functionMatch) {
          // Wrap the code and extract the function
          const wrappedCode = `
            ${code}
            return typeof transform !== 'undefined' ? transform : (typeof validate !== 'undefined' ? validate : null);
          `;
          userFunction = new Function(wrappedCode)();
        }

        if (!userFunction) {
          errors.push({
            rowIndex: -1,
            field: '',
            value: null,
            errorType: 'invalid_code',
            message: `Rule "${rule.name}" has invalid code - no transform or validate function found`,
          });
          return { success: false, changes, errors, warnings, modifiedRows };
        }

        // Apply the function to each row and target field
        for (let rowIndex = 0; rowIndex < modifiedRows.length; rowIndex++) {
          const row = modifiedRows[rowIndex];

          for (const match of targetMatches) {
            const fieldName = match.matchedField!.hubspotField;
            const originalHeader = match.originalHeader;
            const originalValue = row[originalHeader];

            try {
              // Create a simple row object for the user function
              const rowData: Record<string, unknown> = {};
              for (const hm of headerMatches) {
                if (hm.matchedField) {
                  rowData[hm.matchedField.hubspotField] = row[hm.originalHeader];
                }
              }

              const result = userFunction(originalValue, fieldName, rowData);

              if (rule.ruleType === 'transform') {
                // Transform: update the value if changed
                if (result !== originalValue) {
                  changes.push({
                    rowIndex,
                    field: fieldName,
                    originalValue: originalValue as string | number | boolean | null,
                    newValue: result as string | number | boolean | null,
                    reason: rule.description || `Applied ${rule.name}`,
                  });
                  modifiedRows[rowIndex][originalHeader] = result;
                }
              } else {
                // Validate: check the result
                const validationResult = result as { valid: boolean; message?: string } | boolean;
                const isValid = typeof validationResult === 'boolean'
                  ? validationResult
                  : validationResult?.valid !== false;

                if (!isValid) {
                  const message = typeof validationResult === 'object' && validationResult?.message
                    ? validationResult.message
                    : `Validation failed for ${fieldName}`;

                  errors.push({
                    rowIndex,
                    field: fieldName,
                    value: originalValue as string | number | boolean | null,
                    errorType: rule.ruleId,
                    message,
                  });
                }
              }
            } catch (err) {
              errors.push({
                rowIndex,
                field: fieldName,
                value: originalValue as string | number | boolean | null,
                errorType: 'execution_error',
                message: `Error executing rule "${rule.name}": ${err instanceof Error ? err.message : 'Unknown error'}`,
              });
            }
          }
        }

        return {
          success: errors.length === 0,
          changes,
          errors,
          warnings,
          modifiedRows,
        };
      } catch (err) {
        errors.push({
          rowIndex: -1,
          field: '',
          value: null,
          errorType: 'code_error',
          message: `Failed to parse rule "${rule.name}" code: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
        return { success: false, changes, errors, warnings, modifiedRows };
      }
    },
  };
}

// Run all enabled scripts in order, including custom rules from database
export function runAllScriptsWithCustomRules(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  requiredFields: string[],
  customRules: AccountRule[],
  enabledScriptIds?: string[]
): ScriptRunnerResult {
  // Get built-in scripts
  const builtInScripts = enabledScriptIds
    ? ALL_SCRIPTS.filter((s) => enabledScriptIds.includes(s.id))
    : [];

  // Create dynamic scripts from custom rules that have code and are enabled
  const dynamicScripts: IValidationScript[] = [];
  for (const rule of customRules) {
    if (rule.enabled && rule.config?.code) {
      const script = createDynamicScript(rule);
      if (script) {
        dynamicScripts.push(script);
      }
    }
  }

  // Combine and sort by order
  const allScriptsToRun = [...builtInScripts, ...dynamicScripts].sort((a, b) => a.order - b.order);

  const scriptResults: ScriptResult[] = [];
  let currentRows = [...rows];
  let totalChanges = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const script of allScriptsToRun) {
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
    totalScripts: allScriptsToRun.length,
    scriptsRun: allScriptsToRun.length,
    scriptResults,
    totalChanges,
    totalErrors,
    totalWarnings,
    processedData: currentRows,
  };
}

// Export types
export type { IValidationScript, ScriptContext, ScriptExecutionResult } from './types';
