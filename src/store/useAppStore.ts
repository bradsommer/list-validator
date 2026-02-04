import { create } from 'zustand';
import type {
  ParsedFile,
  ParsedRow,
  FieldMapping,
  HeaderMatch,
  ValidationResult,
  EnrichmentConfig,
  EnrichmentResult,
  HubSpotMatchResult,
  AuditResult,
  LogEntry,
  UploadSession,
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

  // Field mappings
  fieldMappings: FieldMapping[];
  headerMatches: HeaderMatch[];
  requiredFields: string[];

  // Validation
  validationResult: ValidationResult | null;
  scriptRunnerResult: ScriptRunnerResult | null;
  enabledScripts: string[];
  availableScripts: ValidationScript[];

  // Enrichment
  enrichmentConfigs: EnrichmentConfig[];
  enrichmentResults: EnrichmentResult[];
  isEnriching: boolean;
  enrichmentProgress: { completed: number; total: number };

  // HubSpot
  hubspotResults: HubSpotMatchResult[];
  isSyncing: boolean;
  syncProgress: { completed: number; total: number };

  // Audit
  auditResult: AuditResult | null;

  // Logs
  logs: LogEntry[];

  // Settings
  defaultTaskAssignee: string;
  notifyOnNewCompany: string[];

  // Upload session tracking
  uploadSession: UploadSession | null;

  // Actions
  loadFieldMappingsFromHubSpot: () => Promise<void>;
  setSessionId: (id: string) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  setParsedFile: (file: ParsedFile | null) => void;
  setProcessedData: (data: ParsedRow[]) => void;

  setFieldMappings: (mappings: FieldMapping[]) => void;
  addFieldMapping: (mapping: FieldMapping) => void;
  updateFieldMapping: (id: string, updates: Partial<FieldMapping>) => void;
  removeFieldMapping: (id: string) => void;

  setHeaderMatches: (matches: HeaderMatch[]) => void;
  updateHeaderMatch: (index: number, match: HeaderMatch) => void;

  setRequiredFields: (fields: string[]) => void;
  toggleRequiredField: (field: string) => void;

  setValidationResult: (result: ValidationResult | null) => void;
  setScriptRunnerResult: (result: ScriptRunnerResult | null) => void;
  setEnabledScripts: (scriptIds: string[]) => void;
  toggleScript: (scriptId: string) => void;
  setAvailableScripts: (scripts: ValidationScript[]) => void;

  setEnrichmentConfigs: (configs: EnrichmentConfig[]) => void;
  addEnrichmentConfig: (config: EnrichmentConfig) => void;
  updateEnrichmentConfig: (id: string, updates: Partial<EnrichmentConfig>) => void;
  removeEnrichmentConfig: (id: string) => void;

  setEnrichmentResults: (results: EnrichmentResult[]) => void;
  setIsEnriching: (isEnriching: boolean) => void;
  setEnrichmentProgress: (progress: { completed: number; total: number }) => void;

  setHubSpotResults: (results: HubSpotMatchResult[]) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setSyncProgress: (progress: { completed: number; total: number }) => void;

  setAuditResult: (result: AuditResult | null) => void;

  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  setDefaultTaskAssignee: (assignee: string) => void;
  setNotifyOnNewCompany: (users: string[]) => void;

  setUploadSession: (session: UploadSession | null) => void;
  updateUploadSessionStatus: (status: UploadSession['status']) => void;

  reset: () => void;
}

const initialState = {
  sessionId: generateSessionId(),
  currentStep: 0,
  steps: ['Upload', 'Map Fields', 'Validate', 'Enrich', 'HubSpot Sync', 'Audit & Export'],
  parsedFile: null,
  processedData: [],
  fieldMappings: [] as FieldMapping[],
  headerMatches: [],
  requiredFields: ['email'],
  validationResult: null,
  scriptRunnerResult: null,
  enabledScripts: [], // Will be populated with all script IDs by default
  availableScripts: [],
  enrichmentConfigs: [],
  enrichmentResults: [],
  isEnriching: false,
  enrichmentProgress: { completed: 0, total: 0 },
  hubspotResults: [],
  isSyncing: false,
  syncProgress: { completed: 0, total: 0 },
  auditResult: null,
  logs: [],
  defaultTaskAssignee: '',
  notifyOnNewCompany: [],
  uploadSession: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  loadFieldMappingsFromHubSpot: async () => {
    try {
      const response = await fetch('/api/hubspot/properties');
      const data = await response.json();
      if (data.success && data.properties?.length > 0) {
        const mappings: FieldMapping[] = data.properties.map(
          (prop: { field_name: string; field_label: string; field_type: string }, i: number) => ({
            id: `hs_${i}`,
            hubspotField: prop.field_name,
            hubspotLabel: prop.field_label,
            variants: [
              prop.field_name,
              prop.field_label.toLowerCase(),
              prop.field_name.replace(/_/g, ' '),
              prop.field_name.replace(/_/g, ''),
            ].filter((v, idx, arr) => arr.indexOf(v) === idx),
            isRequired: prop.field_name === 'email',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
        set({ fieldMappings: mappings });
      }
    } catch {
      // If fetch fails, keep the default hardcoded mappings
      console.error('Failed to load HubSpot properties, using defaults');
    }
  },

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

  setFieldMappings: (mappings) => set({ fieldMappings: mappings }),
  addFieldMapping: (mapping) => set((state) => ({
    fieldMappings: [...state.fieldMappings, mapping]
  })),
  updateFieldMapping: (id, updates) => set((state) => ({
    fieldMappings: state.fieldMappings.map((m) =>
      m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
    )
  })),
  removeFieldMapping: (id) => set((state) => ({
    fieldMappings: state.fieldMappings.filter((m) => m.id !== id)
  })),

  setHeaderMatches: (matches) => set({ headerMatches: matches }),
  updateHeaderMatch: (index, match) => set((state) => ({
    headerMatches: state.headerMatches.map((m, i) => i === index ? match : m)
  })),

  setRequiredFields: (fields) => set({ requiredFields: fields }),
  toggleRequiredField: (field) => set((state) => ({
    requiredFields: state.requiredFields.includes(field)
      ? state.requiredFields.filter((f) => f !== field)
      : [...state.requiredFields, field]
  })),

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
    enabledScripts: scripts.map(s => s.id), // Enable all by default
  }),

  setEnrichmentConfigs: (configs) => set({ enrichmentConfigs: configs }),
  addEnrichmentConfig: (config) => set((state) => ({
    enrichmentConfigs: [...state.enrichmentConfigs, config]
  })),
  updateEnrichmentConfig: (id, updates) => set((state) => ({
    enrichmentConfigs: state.enrichmentConfigs.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    )
  })),
  removeEnrichmentConfig: (id) => set((state) => ({
    enrichmentConfigs: state.enrichmentConfigs.filter((c) => c.id !== id)
  })),

  setEnrichmentResults: (results) => set({ enrichmentResults: results }),
  setIsEnriching: (isEnriching) => set({ isEnriching }),
  setEnrichmentProgress: (progress) => set({ enrichmentProgress: progress }),

  setHubSpotResults: (results) => set({ hubspotResults: results }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),

  setAuditResult: (result) => set({ auditResult: result }),

  addLog: (log) => set((state) => ({
    logs: [...state.logs, log]
  })),
  clearLogs: () => set({ logs: [] }),

  setDefaultTaskAssignee: (assignee) => set({ defaultTaskAssignee: assignee }),
  setNotifyOnNewCompany: (users) => set({ notifyOnNewCompany: users }),

  setUploadSession: (session) => set({ uploadSession: session }),
  updateUploadSessionStatus: (status) => set((state) => ({
    uploadSession: state.uploadSession
      ? { ...state.uploadSession, status, updatedAt: new Date().toISOString() }
      : null
  })),

  reset: () => set({
    ...initialState,
    sessionId: generateSessionId(),
  }),
}));
