'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { getValidationSummary, getScriptSummary, getAvailableScripts } from '@/lib/validator';
import { logInfo, logError, logSuccess } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAccountRules, type AccountRule } from '@/lib/accountRules';
import { useValidationWorker } from '@/hooks/useValidationWorker';
import { supabase } from '@/lib/supabase';
import type { DynamicScriptSource } from '@/lib/scripts';
import type { ScriptResult } from '@/types';

export function ValidationResults({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    sessionId,
    parsedFile,
    processedData,
    headerMatches,
    requiredFields,
    validationResult,
    scriptRunnerResult,
    enabledScripts,
    availableScripts,
    questionColumnValues,
    importRuleOverrides,
    columnMapping,
    setValidationResult,
    setScriptRunnerResult,
    setProcessedData,
    setAvailableScripts,
    setEnabledScripts,
    toggleScript,
    prevStep,
  } = useAppStore();

  const { runValidation: runWorkerValidation, isRunning: isValidating, progress: workerProgress, error: workerError } = useValidationWorker();
  const [showScripts, setShowScripts] = useState(true);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showChanges, setShowChanges] = useState(true);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const [accountRules, setAccountRules] = useState<AccountRule[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const accountId = user?.accountId || 'default';

  // Helper to get original column header name from field name
  const getColumnName = (fieldName: string): string => {
    const match = headerMatches.find(
      (m) => m.matchedField?.hubspotField === fieldName
    );
    return match?.originalHeader || fieldName;
  };

  // Build target fields overrides map from account rules
  const targetFieldsOverrides: Record<string, string[]> = {};
  for (const rule of accountRules) {
    if (rule.targetFields.length > 0) {
      targetFieldsOverrides[rule.ruleId] = rule.targetFields;
    }
  }

  // Build dynamic script sources for rules that have executable source code in the DB.
  // Skip source code that looks like a full TypeScript module (has imports/exports/class
  // definitions) — those are stored for display in the editor but can't run via new Function().
  // Only plain JavaScript function bodies are executable at runtime.
  const isExecutableSource = (code: string) => {
    const trimmed = code.trimStart();
    return !trimmed.startsWith('import ') && !trimmed.includes('export class ') && !trimmed.includes('implements IValidationScript');
  };

  const dynamicScriptSources: DynamicScriptSource[] = accountRules
    .filter((rule) => rule.sourceCode && isExecutableSource(rule.sourceCode))
    .map((rule) => ({
      id: rule.ruleId,
      name: rule.name,
      type: rule.ruleType,
      targetFields: rule.targetFields,
      order: rule.displayOrder,
      sourceCode: rule.sourceCode!,
    }));

  // Load available scripts and rules, applying import-level overrides
  useEffect(() => {
    const loadScriptsAndRules = async () => {
      if (availableScripts.length === 0) {
        const scripts = getAvailableScripts();
        setAvailableScripts(scripts);
      }

      // Fetch all rules from database (per-account) with full config
      try {
        const allRules = await fetchAccountRules(accountId);

        // Apply import-level overrides if the user configured them in the Rules step
        const hasOverrides = Object.keys(importRuleOverrides).length > 0;
        const enabledRules = allRules.filter((r) =>
          hasOverrides ? importRuleOverrides[r.ruleId] : r.enabled
        );

        setAccountRules(enabledRules);
        if (enabledRules.length > 0) {
          setEnabledScripts(enabledRules.map((r) => r.ruleId));
        } else {
          // Fallback: if no rules enabled, enable all available scripts
          const scripts = getAvailableScripts();
          setEnabledScripts(scripts.map((s) => s.id));
        }
      } catch {
        // On error, enable all scripts as fallback
        const scripts = getAvailableScripts();
        setEnabledScripts(scripts.map((s) => s.id));
      }
    };

    loadScriptsAndRules();
  }, [accountId, availableScripts.length, importRuleOverrides, setAvailableScripts, setEnabledScripts]);

  const runValidation = async () => {
    // Always use original data from parsedFile to ensure scripts see fresh data
    // This prevents issues when re-running validation on already-transformed data
    const sourceData = parsedFile?.rows || processedData;

    logInfo('validate', 'Starting data validation with scripts', sessionId, {
      totalRows: sourceData.length,
      requiredFields,
      enabledScripts,
    });

    try {
      const result = await runWorkerValidation(
        sourceData,
        headerMatches,
        requiredFields,
        enabledScripts.length > 0 ? enabledScripts : undefined,
        targetFieldsOverrides,
        dynamicScriptSources.length > 0 ? dynamicScriptSources : undefined
      );

      setValidationResult(result.validationResult);
      setScriptRunnerResult(result.scriptRunnerResult);

      // Apply question column values to transformed data
      // This ensures question answers persist even when validation re-runs from original data
      let finalData = result.transformedData;
      if (Object.keys(questionColumnValues).length > 0) {
        finalData = result.transformedData.map((row) => ({
          ...row,
          ...questionColumnValues,
        }));
      }

      // Always update processed data with transformed output from scripts
      setProcessedData(finalData);

      if (result.validationResult.isValid) {
        const changes = result.scriptRunnerResult.totalChanges;
        setToast(
          changes > 0
            ? `All data is valid! (${changes} values auto-corrected)`
            : 'All data is valid!'
        );
        logSuccess('validate', 'Validation passed', sessionId, {
          changes,
        });
      } else {
        logError('validate', `Validation found ${result.validationResult.errors.length} errors`, sessionId, {
          summary: getValidationSummary(result.validationResult),
        });
      }
    } catch (error) {
      logError('validate', 'Validation failed', sessionId, { error });
    }
  };

  // Run validation on mount or when scripts change
  // Use parsedFile to determine if we have data, since processedData gets transformed
  useEffect(() => {
    const hasData = parsedFile?.rows?.length || processedData.length > 0;
    if (hasData && enabledScripts.length > 0 && !validationResult) {
      runValidation();
    }
  }, [parsedFile?.rows?.length, processedData.length, enabledScripts.length]);

  const toggleScriptExpanded = (scriptId: string) => {
    const newExpanded = new Set(expandedScripts);
    if (newExpanded.has(scriptId)) {
      newExpanded.delete(scriptId);
    } else {
      newExpanded.add(scriptId);
    }
    setExpandedScripts(newExpanded);
  };

  const handleRerunValidation = () => {
    setValidationResult(null);
    setScriptRunnerResult(null);
    runValidation();
  };

  const handleExportCSV = async () => {
    if (processedData.length === 0) return;

    // Use all headers from the data (original column names + question columns)
    const originalHeaders = headerMatches.map((m) => m.originalHeader);
    const questionHeaders = Object.keys(questionColumnValues).filter(
      (h) => !originalHeaders.includes(h)
    );
    const allHeaders = [...originalHeaders, ...questionHeaders];

    // Build CSV with original headers
    const csvHeaders = allHeaders.map((h) => {
      if (h.includes(',') || h.includes('"')) return `"${h.replace(/"/g, '""')}"`;
      return h;
    }).join(',');
    const csvRows = processedData.map((row) =>
      allHeaders
        .map((h) => {
          const val = String(row[h] || '');
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    );

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Save import session to history
    const fileName = parsedFile?.fileName || `cleaned-data-${new Date().toISOString().slice(0, 10)}.csv`;
    const csvBytes = new Blob([csv]).size;
    const fieldMappings: Record<string, string> = {};
    for (const match of headerMatches) {
      if (match.isMatched && match.matchedField) {
        fieldMappings[match.originalHeader] = match.matchedField.name;
      }
    }

    try {
      await supabase.from('upload_sessions').insert({
        account_id: user?.accountId || null,
        user_id: user?.id || null,
        file_name: fileName,
        status: 'completed',
        total_rows: processedData.length,
        processed_rows: processedData.length,
        synced_rows: processedData.length,
        failed_rows: 0,
        field_mappings: Object.keys(fieldMappings).length > 0 ? fieldMappings : columnMapping || {},
        file_content: btoa(csv),
        file_type: 'text/csv',
        file_size: csvBytes,
        completed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save import history:', err);
    }

    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Redirect to dashboard after download starts
    router.push('/');
  };

  if (isValidating) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Running validation scripts...</p>
        {workerProgress && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500">
              Script {workerProgress.currentScript} of {workerProgress.totalScripts}: {workerProgress.scriptName}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${workerProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{workerProgress.percent}%</p>
          </div>
        )}
        {workerError && (
          <p className="text-sm text-red-500 mt-2">{workerError}</p>
        )}
      </div>
    );
  }

  if (!validationResult || !scriptRunnerResult) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Configure validation scripts and run validation</p>
        <button
          onClick={runValidation}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Run Validation
        </button>
      </div>
    );
  }

  const summary = getValidationSummary(validationResult);
  const scriptSummary = getScriptSummary(scriptRunnerResult);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Validation Results</h2>
        <button
          onClick={handleRerunValidation}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          Re-run Validation
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{validationResult.validRows}</div>
          <div className="text-sm text-green-600">Valid Rows</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{validationResult.invalidRows}</div>
          <div className="text-sm text-red-600">Invalid Rows</div>
        </div>
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-primary-700">{scriptSummary.totalChanges}</div>
          <div className="text-sm text-primary-600">Auto-Fixed</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{summary.totalErrors}</div>
          <div className="text-sm text-red-600">Errors</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{summary.totalWarnings}</div>
          <div className="text-sm text-yellow-600">Warnings</div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white bg-green-600 animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 p-0.5 rounded hover:bg-green-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Status banner (errors only) */}
      {!validationResult.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 font-medium">
            Please fix the errors below before proceeding.
          </span>
        </div>
      )}

      {/* Script-by-script results */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowScripts(!showScripts)}
          className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Validation Scripts</span>
            <span className="text-sm text-gray-500">({scriptSummary.scriptsRun} scripts run)</span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showScripts ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showScripts && (
          <div className="divide-y divide-gray-100">
            {scriptRunnerResult.scriptResults.map((result) => (
              <ScriptResultRow
                key={result.scriptId}
                result={result}
                isExpanded={expandedScripts.has(result.scriptId)}
                onToggle={() => toggleScriptExpanded(result.scriptId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4">
        {scriptSummary.totalChanges > 0 && (
          <button
            onClick={() => setShowChanges(!showChanges)}
            className={`px-4 py-2 rounded-lg text-sm ${
              showChanges ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {showChanges ? 'Hide' : 'Show'} Changes ({scriptSummary.totalChanges})
          </button>
        )}
        <button
          onClick={() => setShowErrors(!showErrors)}
          className={`px-4 py-2 rounded-lg text-sm ${
            showErrors ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {showErrors ? 'Hide' : 'Show'} Errors ({summary.totalErrors})
        </button>
        <button
          onClick={() => setShowWarnings(!showWarnings)}
          className={`px-4 py-2 rounded-lg text-sm ${
            showWarnings ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {showWarnings ? 'Hide' : 'Show'} Warnings ({summary.totalWarnings})
        </button>
      </div>

      {/* Changes list */}
      {showChanges && scriptSummary.totalChanges > 0 && (
        <div className="border border-primary-200 rounded-lg overflow-hidden">
          <div className="bg-primary-50 px-4 py-2 border-b border-primary-200">
            <h3 className="font-medium text-primary-700">Auto-Corrected Values</h3>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Column Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Original</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Corrected</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scriptRunnerResult.scriptResults
                  .flatMap((r) => r.changes.map((c) => ({ ...c, scriptName: r.scriptName })))
                  .slice(0, 100)
                  .map((change, index) => (
                    <tr key={index} className="hover:bg-primary-50">
                      <td className="px-4 py-2 text-sm">{change.rowIndex + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{getColumnName(change.field)}</td>
                      <td className="px-4 py-2 text-sm font-medium">{change.field}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 line-through">
                        {String(change.originalValue || '')}
                      </td>
                      <td className="px-4 py-2 text-sm text-primary-700 font-medium">
                        {String(change.newValue || '')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{change.reason}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {scriptSummary.totalChanges > 100 && (
            <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
              Showing 100 of {scriptSummary.totalChanges} changes
            </div>
          )}
        </div>
      )}

      {/* Error list */}
      {showErrors && validationResult.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200">
            <h3 className="font-medium text-red-700">Errors</h3>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Column Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validationResult.errors.slice(0, 100).map((error, index) => (
                  <tr key={index} className="hover:bg-red-50">
                    <td className="px-4 py-2 text-sm">{error.row}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{getColumnName(error.field)}</td>
                    <td className="px-4 py-2 text-sm font-medium">{error.field}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validationResult.errors.length > 100 && (
            <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
              Showing 100 of {validationResult.errors.length} errors
            </div>
          )}
        </div>
      )}

      {/* Warning list */}
      {showWarnings && validationResult.warnings.length > 0 && (
        <div className="border border-yellow-200 rounded-lg overflow-hidden">
          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
            <h3 className="font-medium text-yellow-700">Warnings</h3>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Column Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validationResult.warnings.slice(0, 100).map((warning, index) => (
                  <tr key={index} className="hover:bg-yellow-50">
                    <td className="px-4 py-2 text-sm">{warning.row}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{getColumnName(warning.field)}</td>
                    <td className="px-4 py-2 text-sm font-medium">{warning.field}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{warning.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Preview Table */}
      <DataPreviewTable />

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 text-sm" style={{ color: '#0b8377' }}>
              Cancel
            </button>
          )}
        </div>
        <button
          onClick={handleExportCSV}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Export Cleaned CSV
        </button>
      </div>
    </div>
  );
}

// Data preview table showing transformed data with highlighted changes
function DataPreviewTable() {
  const { processedData, headerMatches, scriptRunnerResult, questionColumnValues } = useAppStore();
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const pageSize = 25;

  if (processedData.length === 0) return null;

  // Show all columns from the data (original + question columns)
  const originalHeaders = headerMatches.map((m) => m.originalHeader);
  const questionHeaders = Object.keys(questionColumnValues).filter(
    (h) => !originalHeaders.includes(h)
  );
  const allHeaders = [...originalHeaders, ...questionHeaders];

  // Build a set of changed cells for highlighting
  const changedCells = new Set<string>();
  if (scriptRunnerResult) {
    for (const result of scriptRunnerResult.scriptResults) {
      for (const change of result.changes) {
        changedCells.add(`${change.rowIndex}-${change.field}`);
      }
    }
  }

  const totalPages = Math.ceil(processedData.length / pageSize);
  const pageData = processedData.slice(previewPage * pageSize, (previewPage + 1) * pageSize);
  const startRow = previewPage * pageSize;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Data Preview</span>
          <span className="text-sm text-gray-500">
            ({processedData.length} rows, {allHeaders.length} columns)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded">
            Green cells = auto-corrected
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showPreview ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {showPreview && (
        <div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b whitespace-nowrap">#</th>
                  {allHeaders.map((header) => (
                    <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageData.map((row, idx) => {
                  const rowIndex = startRow + idx;
                  return (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{rowIndex + 1}</td>
                      {allHeaders.map((header) => {
                        // Check if this cell was changed by looking at the detected field name
                        const match = headerMatches.find((m) => m.originalHeader === header);
                        const fieldName = match?.matchedField?.hubspotField || header;
                        const isChanged = changedCells.has(`${rowIndex}-${fieldName}`);
                        return (
                          <td
                            key={header}
                            className={`px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate ${
                              isChanged ? 'bg-primary-50 text-primary-800 font-medium' : 'text-gray-700'
                            }`}
                            title={String(row[header] || '')}
                          >
                            {String(row[header] || '')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                Showing {startRow + 1}-{Math.min(startRow + pageSize, processedData.length)} of {processedData.length} rows
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                  disabled={previewPage === 0}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPreviewPage(Math.min(totalPages - 1, previewPage + 1))}
                  disabled={previewPage >= totalPages - 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual script result row component
function ScriptResultRow({
  result,
  isExpanded,
  onToggle,
}: {
  result: ScriptResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = result.changes.length > 0 || result.errors.length > 0 || result.warnings.length > 0;

  const getStatusIcon = () => {
    if (result.errors.length > 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      );
    }
    if (result.changes.length > 0) {
      return (
        <span className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  };

  return (
    <div>
      <button
        onClick={onToggle}
        disabled={!hasDetails}
        className={`w-full px-4 py-3 flex items-center justify-between ${
          hasDetails ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="text-left">
            <div className="font-medium text-gray-900">{result.scriptName}</div>
            <div className="text-sm text-gray-500">
              {result.scriptType === 'transform' ? 'Transform' : 'Validate'}
              {' • '}
              {result.rowsProcessed} rows • {result.executionTimeMs.toFixed(0)}ms
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {result.changes.length > 0 && (
            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
              {result.changes.length} changes
            </span>
          )}
          {result.errors.length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
              {result.errors.length} errors
            </span>
          )}
          {result.warnings.length > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              {result.warnings.length} warnings
            </span>
          )}
          {hasDetails && (
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          {/* Changes */}
          {result.changes.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Changes</h4>
              <div className="max-h-40 overflow-auto border border-gray-200 rounded bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1 text-left text-xs text-gray-500">Row</th>
                      <th className="px-3 py-1 text-left text-xs text-gray-500">Original</th>
                      <th className="px-3 py-1 text-left text-xs text-gray-500">New</th>
                      <th className="px-3 py-1 text-left text-xs text-gray-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.changes.slice(0, 20).map((change, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1">{change.rowIndex + 1}</td>
                        <td className="px-3 py-1 text-gray-500 line-through">{String(change.originalValue || '')}</td>
                        <td className="px-3 py-1 text-primary-700">{String(change.newValue || '')}</td>
                        <td className="px-3 py-1 text-gray-600">{change.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-700 mb-2">Errors</h4>
              <div className="max-h-40 overflow-auto border border-red-200 rounded bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1 text-left text-xs text-red-600">Row</th>
                      <th className="px-3 py-1 text-left text-xs text-red-600">Field</th>
                      <th className="px-3 py-1 text-left text-xs text-red-600">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {result.errors.slice(0, 20).map((error, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1">{error.rowIndex + 1}</td>
                        <td className="px-3 py-1">{error.field}</td>
                        <td className="px-3 py-1 text-gray-600">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-yellow-700 mb-2">Warnings</h4>
              <div className="max-h-40 overflow-auto border border-yellow-200 rounded bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-yellow-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1 text-left text-xs text-yellow-600">Row</th>
                      <th className="px-3 py-1 text-left text-xs text-yellow-600">Field</th>
                      <th className="px-3 py-1 text-left text-xs text-yellow-600">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-yellow-100">
                    {result.warnings.slice(0, 20).map((warning, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1">{warning.rowIndex + 1}</td>
                        <td className="px-3 py-1">{warning.field}</td>
                        <td className="px-3 py-1 text-gray-600">{warning.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
