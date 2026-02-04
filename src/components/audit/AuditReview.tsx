'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { runAudit, getAuditSummary, getCleanData, getFlaggedData } from '@/lib/audit';
import { exportToCSV, exportToExcel } from '@/lib/fileParser';
import { logInfo, logSuccess } from '@/lib/logger';
import type { ParsedRow } from '@/types';

/** Remap row keys using the column mapping (original header → HubSpot heading) */
function remapRows(rows: ParsedRow[], mapping: Record<string, string>): ParsedRow[] {
  // Build key rename map — only for columns that have a mapping set
  const hasRenames = Object.values(mapping).some((v) => v);
  if (!hasRenames) return rows;

  return rows.map((row) => {
    const newRow: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      const renamed = mapping[key];
      newRow[renamed || key] = value;
    }
    return newRow;
  });
}

export function AuditReview() {
  const {
    sessionId,
    processedData,
    headerMatches,
    auditResult,
    parsedFile,
    columnMapping,
    setAuditResult,
    prevStep,
    reset,
  } = useAppStore();

  const [isAuditing, setIsAuditing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [showFlagged, setShowFlagged] = useState(true);

  useEffect(() => {
    const runAuditProcess = async () => {
      if (auditResult) return;

      setIsAuditing(true);
      await logInfo('audit', 'Running final audit', sessionId);

      const result = runAudit(
        processedData,
        headerMatches
      );
      setAuditResult(result);

      await logSuccess('audit', 'Audit complete', sessionId, {
        summary: getAuditSummary(result),
      });

      setIsAuditing(false);
    };

    runAuditProcess();
  }, [processedData, headerMatches, sessionId, setAuditResult, auditResult]);

  const handleExportClean = () => {
    if (!auditResult) return;

    const cleanData = getCleanData(processedData, auditResult);
    const exportData = remapRows(cleanData, columnMapping);
    const fileName = `${parsedFile?.fileName.replace(/\.[^/.]+$/, '') || 'export'}_clean`;

    if (exportFormat === 'csv') {
      exportToCSV(exportData, `${fileName}.csv`);
    } else {
      exportToExcel(exportData, `${fileName}.xlsx`);
    }

    logSuccess('export', `Exported ${cleanData.length} clean rows`, sessionId);
  };

  const handleExportFlagged = () => {
    if (!auditResult) return;

    const flaggedData = getFlaggedData(processedData, auditResult);
    const flaggedExport = flaggedData.map(({ row, flags }) => ({
      ...row,
      _audit_flags: flags.map((f) => f.reason).join('; '),
    }));
    const exportData = remapRows(flaggedExport, columnMapping);
    const fileName = `${parsedFile?.fileName.replace(/\.[^/.]+$/, '') || 'export'}_flagged_review`;

    if (exportFormat === 'csv') {
      exportToCSV(exportData, `${fileName}.csv`);
    } else {
      exportToExcel(exportData, `${fileName}.xlsx`);
    }

    logSuccess('export', `Exported ${flaggedData.length} flagged rows for review`, sessionId);
  };

  const handleExportAll = () => {
    const exportData = remapRows(processedData, columnMapping);
    const fileName = `${parsedFile?.fileName.replace(/\.[^/.]+$/, '') || 'export'}_cleaned`;

    if (exportFormat === 'csv') {
      exportToCSV(exportData, `${fileName}.csv`);
    } else {
      exportToExcel(exportData, `${fileName}.xlsx`);
    }

    logSuccess('export', `Exported all ${processedData.length} rows`, sessionId);
  };

  const handleStartNew = () => {
    reset();
  };

  if (isAuditing) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Running final audit...</p>
      </div>
    );
  }

  if (!auditResult) {
    return <div className="text-center text-gray-500">No audit results</div>;
  }

  const summary = getAuditSummary(auditResult);
  const flaggedData = getFlaggedData(processedData, auditResult);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Review & Export</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{summary.cleanRows}</div>
          <div className="text-sm text-green-600">Clean Rows</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{summary.flaggedRows}</div>
          <div className="text-sm text-yellow-600">Flagged for Review</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{summary.autoResolved}</div>
          <div className="text-sm text-blue-600">Auto-Resolved</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-700">{summary.totalRows}</div>
          <div className="text-sm text-gray-600">Total Rows</div>
        </div>
      </div>

      {/* Flags by reason */}
      {Object.keys(summary.flagsByReason).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Flags by Reason</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.flagsByReason).map(([reason, count]) => (
              <span
                key={reason}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
              >
                {reason}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Flagged rows toggle */}
      {flaggedData.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFlagged(!showFlagged)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showFlagged ? 'Hide' : 'Show'} flagged rows ({flaggedData.length})
          </button>
          <span className="text-xs text-gray-500">These are advisory warnings only — all rows will still be included in the export.</span>
        </div>
      )}

      {/* Flagged rows table */}
      {showFlagged && flaggedData.length > 0 && (
        <div className="border border-yellow-200 rounded-lg overflow-hidden">
          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
            <h3 className="font-medium text-yellow-700">Rows Flagged for Review</h3>
            <p className="text-xs text-yellow-600 mt-0.5">These flags highlight potential data quality issues for your review. They do not prevent rows from being exported.</p>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flaggedData.slice(0, 50).map(({ row, flags }, index) => (
                  <tr key={index} className="hover:bg-yellow-50">
                    <td className="px-4 py-2 text-sm">{flags[0]?.rowIndex + 1}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="max-w-xs truncate">
                        {Object.entries(row)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {flags.map((flag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded"
                            title={flag.suggestedValue ? `Suggested: ${flag.suggestedValue}` : ''}
                          >
                            {flag.reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export section */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h3 className="font-medium text-gray-900">Export Data</h3>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Format:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setExportFormat('csv')}
              className={`px-3 py-1 text-sm rounded ${
                exportFormat === 'csv'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              CSV
            </button>
            <button
              onClick={() => setExportFormat('xlsx')}
              className={`px-3 py-1 text-sm rounded ${
                exportFormat === 'xlsx'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Excel
            </button>
          </div>
        </div>

        <button
          onClick={handleExportAll}
          className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex flex-col items-center"
        >
          <span className="font-medium">Export Data</span>
          <span className="text-sm opacity-80">{summary.totalRows} rows — cleaned and formatted</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportClean}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex flex-col items-center text-sm"
          >
            <span className="font-medium">Export Clean Only</span>
            <span className="text-xs text-gray-500">{summary.cleanRows} rows</span>
          </button>
          <button
            onClick={handleExportFlagged}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex flex-col items-center text-sm"
          >
            <span className="font-medium">Export Flagged Only</span>
            <span className="text-xs text-gray-500">{summary.flaggedRows} rows</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={prevStep} className="px-6 py-2 text-gray-600 hover:text-gray-800">
          Back
        </button>
        <button
          onClick={handleStartNew}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Start New Upload
        </button>
      </div>
    </div>
  );
}
