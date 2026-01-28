'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { validateData, getValidationSummary } from '@/lib/validator';
import { logInfo, logError, logSuccess } from '@/lib/logger';

export function ValidationResults() {
  const {
    sessionId,
    processedData,
    headerMatches,
    requiredFields,
    validationResult,
    setValidationResult,
    nextStep,
    prevStep,
  } = useAppStore();

  const [isValidating, setIsValidating] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  useEffect(() => {
    const runValidation = async () => {
      if (validationResult) return;

      setIsValidating(true);
      await logInfo('validate', 'Starting data validation', sessionId, {
        totalRows: processedData.length,
        requiredFields,
      });

      try {
        const result = validateData(processedData, headerMatches, requiredFields);
        setValidationResult(result);

        if (result.isValid) {
          await logSuccess('validate', 'Validation passed with no errors', sessionId);
        } else {
          await logError('validate', `Validation found ${result.errors.length} errors`, sessionId, {
            summary: getValidationSummary(result),
          });
        }
      } catch (error) {
        await logError('validate', 'Validation failed', sessionId, { error });
      } finally {
        setIsValidating(false);
      }
    };

    runValidation();
  }, [processedData, headerMatches, requiredFields, sessionId, setValidationResult, validationResult]);

  if (isValidating) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Validating data...</p>
      </div>
    );
  }

  if (!validationResult) {
    return <div className="text-center text-gray-500">No validation results</div>;
  }

  const summary = getValidationSummary(validationResult);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Validation Results</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{validationResult.validRows}</div>
          <div className="text-sm text-green-600">Valid Rows</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{validationResult.invalidRows}</div>
          <div className="text-sm text-red-600">Invalid Rows</div>
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

      {/* Status banner */}
      {validationResult.isValid ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-700 font-medium">All data is valid! Ready to proceed.</span>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-700 font-medium">
            Please fix the errors below before proceeding.
          </span>
        </div>
      )}

      {/* Error breakdown */}
      {Object.keys(summary.errorsByType).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Errors by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.errorsByType).map(([type, count]) => (
              <span key={type} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                {type.replace(/_/g, ' ')}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="flex gap-4">
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

      {/* Error list */}
      {showErrors && validationResult.errors.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200">
            <h3 className="font-medium text-red-700">Errors</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validationResult.errors.slice(0, 100).map((error, index) => (
                  <tr key={index} className="hover:bg-red-50">
                    <td className="px-4 py-2 text-sm">{error.row}</td>
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
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validationResult.warnings.slice(0, 100).map((warning, index) => (
                  <tr key={index} className="hover:bg-yellow-50">
                    <td className="px-4 py-2 text-sm">{warning.row}</td>
                    <td className="px-4 py-2 text-sm font-medium">{warning.field}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{warning.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={prevStep}
          className="px-6 py-2 text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!validationResult.isValid}
          className={`px-6 py-2 rounded-lg ${
            validationResult.isValid
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Enrichment
        </button>
      </div>
    </div>
  );
}
