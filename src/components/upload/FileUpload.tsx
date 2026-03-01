'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseFile } from '@/lib/fileParser';
import { autoDetectColumns } from '@/lib/columnDetector';
import { logInfo, logError, logSuccess } from '@/lib/logger';
import { useAppStore } from '@/store/useAppStore';

// Maximum rows for free-tier client-side processing.
// No data is stored on our servers for free-tier users — all
// processing happens locally in the browser.
const CLIENT_ROW_LIMIT = 7_000;

export function FileUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowLimitWarning, setRowLimitWarning] = useState<string | null>(null);

  const {
    sessionId,
    setParsedFile,
    setProcessedData,
    setHeaderMatches,
    setValidationResult,
    setScriptRunnerResult,
    nextStep,
  } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsProcessing(true);
      setError(null);
      setRowLimitWarning(null);

      await logInfo('upload', `Starting file upload: ${file.name}`, sessionId, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      try {
        // Parse the file
        const parsed = await parseFile(file);
        await logSuccess('parse', `Successfully parsed ${parsed.totalRows} rows`, sessionId, {
          headers: parsed.headers,
          totalRows: parsed.totalRows,
        });

        // Enforce client-side row limit for free-tier users
        if (parsed.totalRows > CLIENT_ROW_LIMIT) {
          setRowLimitWarning(
            `Your file contains ${parsed.totalRows.toLocaleString()} rows.`
          );
          setIsProcessing(false);
          return;
        }

        // Clear previous validation results so validation runs fresh
        setValidationResult(null);
        setScriptRunnerResult(null);

        setParsedFile(parsed);
        setProcessedData(parsed.rows);

        // Auto-detect column types from headers
        const matches = autoDetectColumns(parsed.headers);
        setHeaderMatches(matches);

        const detectedCount = matches.filter((m) => m.isMatched).length;
        await logInfo('detect', `Detected ${detectedCount}/${parsed.headers.length} column types`, sessionId, {
          matches: matches.map((m) => ({
            header: m.originalHeader,
            detected: m.matchedField?.hubspotField || 'unknown',
            confidence: m.confidence,
          })),
        });

        // Move directly to validation
        nextStep();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        await logError('upload', errorMessage, sessionId, { error: err });
      } finally {
        setIsProcessing(false);
      }
    },
    [sessionId, setParsedFile, setProcessedData, setHeaderMatches, setValidationResult, setScriptRunnerResult, nextStep]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {isProcessing ? (
            <div>
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-gray-600">Processing file...</p>
            </div>
          ) : isDragActive ? (
            <p className="text-primary-600 font-medium">Drop the file here</p>
          ) : (
            <>
              <p className="text-gray-600">
                <span className="font-medium text-primary-600">Click to upload</span> or drag and
                drop
              </p>
              <p className="text-sm text-gray-500">CSV, XLS, or XLSX files</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {rowLimitWarning && (
        <div className="mt-4 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="space-y-2">
              <p className="text-yellow-800 text-sm font-medium">File exceeds free plan limit</p>
              <p className="text-yellow-700 text-sm">
                {rowLimitWarning} Due to the limitations of in-browser processing, the free plan supports up to {CLIENT_ROW_LIMIT.toLocaleString()} rows.
              </p>
              <p className="text-yellow-700 text-sm">
                To process larger files, upgrade to our <strong>Premium plan</strong> which includes:
              </p>
              <ul className="text-yellow-700 text-sm list-disc list-inside space-y-1 ml-1">
                <li>Process hundreds of thousands of rows</li>
                <li>Secure server-side data processing</li>
                <li>Sync cleaned data directly to HubSpot</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
