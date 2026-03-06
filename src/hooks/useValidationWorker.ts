'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ParsedRow, HeaderMatch, ValidationResult, ScriptRunnerResult } from '@/types';
import type { WorkerInput, WorkerOutputMessage } from '@/lib/validation.worker';
import type { DynamicScriptSource } from '@/lib/scripts';

export interface ValidationProgress {
  currentScript: number;
  totalScripts: number;
  scriptName: string;
  percent: number;
}

export interface ValidationWorkerResult {
  validationResult: ValidationResult;
  scriptRunnerResult: ScriptRunnerResult;
  transformedData: ParsedRow[];
}

export function useValidationWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const runValidation = useCallback((
    rows: ParsedRow[],
    headerMatches: HeaderMatch[],
    requiredFields: string[],
    enabledScriptIds?: string[],
    targetFieldsOverrides?: Record<string, string[]>,
    dynamicScriptSources?: DynamicScriptSource[]
  ): Promise<ValidationWorkerResult> => {
    return new Promise((resolve, reject) => {
      // Terminate any existing worker
      workerRef.current?.terminate();

      setIsRunning(true);
      setProgress(null);
      setError(null);

      const worker = new Worker(
        new URL('../lib/validation.worker.ts', import.meta.url)
      );
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<WorkerOutputMessage>) => {
        const msg = event.data;

        switch (msg.type) {
          case 'progress':
            setProgress({
              currentScript: msg.currentScript,
              totalScripts: msg.totalScripts,
              scriptName: msg.scriptName,
              percent: Math.round((msg.currentScript / msg.totalScripts) * 100),
            });
            break;

          case 'result':
            setIsRunning(false);
            setProgress(null);
            worker.terminate();
            workerRef.current = null;
            resolve({
              validationResult: msg.validationResult,
              scriptRunnerResult: msg.scriptRunnerResult,
              transformedData: msg.transformedData,
            });
            break;

          case 'error':
            setIsRunning(false);
            setProgress(null);
            setError(msg.message);
            worker.terminate();
            workerRef.current = null;
            reject(new Error(msg.message));
            break;
        }
      };

      worker.onerror = (event) => {
        setIsRunning(false);
        setProgress(null);
        const message = event.message || 'Validation worker failed unexpectedly';
        setError(message);
        worker.terminate();
        workerRef.current = null;
        reject(new Error(message));
      };

      const input: WorkerInput = {
        type: 'run',
        rows,
        headerMatches,
        requiredFields,
        enabledScriptIds,
        targetFieldsOverrides,
        dynamicScriptSources,
      };

      worker.postMessage(input);
    });
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsRunning(false);
    setProgress(null);
  }, []);

  return {
    runValidation,
    cancel,
    isRunning,
    progress,
    error,
  };
}
