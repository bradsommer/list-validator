'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseFile } from '@/lib/fileParser';
import { matchHeaders } from '@/lib/fuzzyMatcher';
import { logInfo, logError, logSuccess } from '@/lib/logger';
import { useAppStore } from '@/store/useAppStore';

export function FileUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    sessionId,
    fieldMappings,
    loadFieldMappingsFromHubSpot,
    setParsedFile,
    setProcessedData,
    setHeaderMatches,
    nextStep,
  } = useAppStore();

  // Load HubSpot properties on mount so the dropdown has all available fields
  useEffect(() => {
    loadFieldMappingsFromHubSpot();
  }, [loadFieldMappingsFromHubSpot]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setIsProcessing(true);
      setError(null);

      await logInfo('upload', `Starting file upload: ${file.name}`, sessionId, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      try {
        // Read file as base64 for storage
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data URL prefix (e.g. "data:text/csv;base64,")
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Parse the file
        const parsed = await parseFile(file);
        await logSuccess('parse', `Successfully parsed ${parsed.totalRows} rows`, sessionId, {
          headers: parsed.headers,
          totalRows: parsed.totalRows,
        });

        setParsedFile(parsed);
        setProcessedData(parsed.rows);

        // Store original file in the pipeline for later download
        try {
          await fetch('/api/pipeline/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileContent: fileBase64,
              fileType: file.type || 'text/csv',
              fileSize: file.size,
              rows: parsed.rows,
              fieldMappings: {},
            }),
          });
        } catch (storeErr) {
          console.error('Failed to store file for history:', storeErr);
          // Non-blocking — import continues even if storage fails
        }

        // Match headers to field mappings
        const matches = matchHeaders(parsed.headers, fieldMappings);
        setHeaderMatches(matches);

        const matchedCount = matches.filter((m) => m.isMatched).length;
        await logInfo('parse', `Matched ${matchedCount}/${parsed.headers.length} headers`, sessionId, {
          matches: matches.map((m) => ({
            original: m.originalHeader,
            matched: m.matchedField?.hubspotLabel || 'Not matched',
            confidence: m.confidence,
          })),
        });

        // Move to next step
        nextStep();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        await logError('upload', errorMessage, sessionId, { error: err });
      } finally {
        setIsProcessing(false);
      }
    },
    [sessionId, fieldMappings, setParsedFile, setProcessedData, setHeaderMatches, nextStep]
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
    </div>
  );
}
