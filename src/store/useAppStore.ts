import { create } from 'zustand';
import type {
  ParsedFile,
  ParsedRow,
  HeaderMatch,
  ValidationResult,
  AuditResult,
  LogEntry,
  ScriptRunnerResult,
  ValidationScript,
} from '@/types';
import { generateSessionId } from '@/lib/logger';

interface AppState {
  // Session
  sessionId: string;
  currentStep: number;
  steps: string[];

  // File data
  parsedFile: ParsedFile | null;
  processedData: ParsedRow[];

  // Column detection (auto-detected from headers)
  headerMatches: HeaderMatch[];
  requiredFields: string[];

  // Validation
  validationResult: ValidationResult | null;
  scriptRunnerResult: ScriptRunnerResult | null;
  enabledScripts: string[];
  availableScripts: ValidationScript[];

  // Audit
  auditResult: AuditResult | null;

  // Logs
  logs: LogEntry[];

  // Actions
  setSessionId: (id: string) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  setParsedFile: (file: ParsedFile | null) => void;
  setProcessedData: (data: ParsedRow[]) => void;

  setHeaderMatches: (matches: HeaderMatch[]) => void;

  setRequiredFields: (fields: string[]) => void;

  setValidationResult: (result: ValidationResult | null) => void;
  setScriptRunnerResult: (result: ScriptRunnerResult | null) => void;
  setEnabledScripts: (scriptIds: string[]) => void;
  toggleScript: (scriptId: string) => void;
  setAvailableScripts: (scripts: ValidationScript[]) => void;

  setAuditResult: (result: AuditResult | null) => void;

  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  reset: () => void;
}

const initialState = {
  sessionId: generateSessionId(),
  currentStep: 0,
  steps: ['Upload', 'Validate', 'Export'],
  parsedFile: null,
  processedData: [],
  headerMatches: [],
  requiredFields: [] as string[],
  validationResult: null,
  scriptRunnerResult: null,
  enabledScripts: [] as string[],
  availableScripts: [] as ValidationScript[],
  auditResult: null,
  logs: [],
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({
    currentStep: Math.min(state.currentStep + 1, state.steps.length - 1)
  })),
  prevStep: () => set((state) => ({
    currentStep: Math.max(state.currentStep - 1, 0)
  })),

  setParsedFile: (file) => set({ parsedFile: file }),
  setProcessedData: (data) => set({ processedData: data }),

  setHeaderMatches: (matches) => set({ headerMatches: matches }),

  setRequiredFields: (fields) => set({ requiredFields: fields }),

  setValidationResult: (result) => set({ validationResult: result }),
  setScriptRunnerResult: (result) => set({ scriptRunnerResult: result }),
  setEnabledScripts: (scriptIds) => set({ enabledScripts: scriptIds }),
  toggleScript: (scriptId) => set((state) => ({
    enabledScripts: state.enabledScripts.includes(scriptId)
      ? state.enabledScripts.filter((id) => id !== scriptId)
      : [...state.enabledScripts, scriptId]
  })),
  setAvailableScripts: (scripts) => set({
    availableScripts: scripts,
    enabledScripts: scripts.map(s => s.id),
  }),

  setAuditResult: (result) => set({ auditResult: result }),

  addLog: (log) => set((state) => ({
    logs: [...state.logs, log]
  })),
  clearLogs: () => set({ logs: [] }),

  reset: () => set({
    ...initialState,
    sessionId: generateSessionId(),
  }),
}));
