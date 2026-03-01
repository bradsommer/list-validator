/// <reference lib="webworker" />

import { validateAndTransform } from './validator';
import type { ParsedRow, HeaderMatch, ValidationResult, ScriptRunnerResult } from '@/types';

export interface WorkerInput {
  type: 'run';
  rows: ParsedRow[];
  headerMatches: HeaderMatch[];
  requiredFields: string[];
  enabledScriptIds?: string[];
  targetFieldsOverrides?: Record<string, string[]>;
}

export interface WorkerProgressMessage {
  type: 'progress';
  currentScript: number;
  totalScripts: number;
  scriptName: string;
}

export interface WorkerResultMessage {
  type: 'result';
  validationResult: ValidationResult;
  scriptRunnerResult: ScriptRunnerResult;
  transformedData: ParsedRow[];
}

export interface WorkerErrorMessage {
  type: 'error';
  message: string;
}

export type WorkerOutputMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { rows, headerMatches, requiredFields, enabledScriptIds, targetFieldsOverrides } = event.data;

  try {
    const result = validateAndTransform(
      rows,
      headerMatches,
      requiredFields,
      enabledScriptIds,
      targetFieldsOverrides,
      (current, total, scriptName) => {
        ctx.postMessage({
          type: 'progress',
          currentScript: current,
          totalScripts: total,
          scriptName,
        } satisfies WorkerProgressMessage);
      }
    );

    ctx.postMessage({
      type: 'result',
      validationResult: result.validationResult,
      scriptRunnerResult: result.scriptRunnerResult,
      transformedData: result.transformedData,
    } satisfies WorkerResultMessage);
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Validation worker encountered an unknown error',
    } satisfies WorkerErrorMessage);
  }
};
