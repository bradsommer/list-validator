import type { ParsedRow, HeaderMatch } from '@/types';

// Context passed to each script
export interface ScriptContext {
  rows: ParsedRow[];
  headerMatches: HeaderMatch[];
  requiredFields: string[];
}

// Interface that all validation scripts must implement
export interface IValidationScript {
  id: string;
  name: string;
  description: string;
  type: 'transform' | 'validate';
  targetFields: string[];
  order: number;

  // Execute the script on the data
  execute(context: ScriptContext): ScriptExecutionResult;
}

export interface ScriptChange {
  rowIndex: number;
  field: string;
  originalValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  reason: string;
}

export interface ScriptError {
  rowIndex: number;
  field: string;
  value: string | number | boolean | null;
  errorType: string;
  message: string;
}

export interface ScriptWarning {
  rowIndex: number;
  field: string;
  value: string | number | boolean | null;
  warningType: string;
  message: string;
}

export interface ScriptExecutionResult {
  success: boolean;
  changes: ScriptChange[];
  errors: ScriptError[];
  warnings: ScriptWarning[];
  modifiedRows: ParsedRow[];
}
