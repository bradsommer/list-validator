// Field mapping types
export type HubSpotObjectType = 'contacts' | 'companies' | 'deals';

export interface FieldMapping {
  id: string;
  hubspotField: string;
  hubspotLabel: string;
  objectType: HubSpotObjectType;
  variants: string[];
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// Parsed file data types
export interface ParsedRow {
  [key: string]: string | number | boolean | null;
}

export interface ParsedFile {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
  totalRows: number;
}

// Header match result
export interface HeaderMatch {
  originalHeader: string;
  matchedField: FieldMapping | null;
  confidence: number;
  isMatched: boolean;
}

// Validation result types
export interface ValidationError {
  row: number;
  field: string;
  value: string | null;
  errorType: 'missing_required' | 'invalid_format' | 'duplicate' | 'enrichment_failed';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRows: number;
  invalidRows: number;
}

// Enrichment types
export interface EnrichmentConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  inputFields: string[];
  outputField: string;
  service: 'serp' | 'clearbit' | 'custom' | 'ai';
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  aiModel?: {
    provider: string;
    modelId: string;
    apiKey?: string;
    baseUrl?: string;
    envKeyName?: string;
  };
}

export interface EnrichmentResult {
  rowIndex: number;
  originalData: ParsedRow;
  enrichedData: Partial<ParsedRow>;
  success: boolean;
  error?: string;
}

// HubSpot types
export interface HubSpotCompany {
  id: string;
  name: string;
  domain: string;
  city?: string;
  state?: string;
  properties: Record<string, string>;
}

export interface HubSpotContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  properties: Record<string, string>;
}

export interface HubSpotMatchResult {
  rowIndex: number;
  contact: Partial<HubSpotContact>;
  matchedCompany: HubSpotCompany | null;
  matchConfidence: number;
  matchType: 'exact_domain' | 'fuzzy_name' | 'created_new' | 'no_match';
  taskCreated: boolean;
  taskId?: string;
}

// Audit types
export interface AuditFlag {
  rowIndex: number;
  field: string;
  reason: string;
  suggestedValue?: string;
  confidence: number;
}

export interface AuditResult {
  flaggedRows: AuditFlag[];
  cleanRows: number[];
  reviewRequired: number;
  autoResolved: number;
}

// Log types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  step: 'upload' | 'parse' | 'validate' | 'enrich' | 'hubspot' | 'audit' | 'export';
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
}

// Settings types
export interface AppSettings {
  defaultTaskAssignee: string;
  notifyOnNewCompany: string[];
  hubspotPortalId: string;
  enrichmentServices: {
    serp: boolean;
    clearbit: boolean;
  };
}

// Upload session types
export interface UploadSession {
  id: string;
  fileName: string;
  status: 'uploading' | 'parsing' | 'mapping' | 'validating' | 'enriching' | 'syncing' | 'auditing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  errors: ValidationError[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Validation Script Types
export type ScriptType = 'transform' | 'validate';

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

export interface ScriptResult {
  scriptId: string;
  scriptName: string;
  scriptType: ScriptType;
  success: boolean;
  changes: ScriptChange[];
  errors: ScriptError[];
  warnings: ScriptWarning[];
  rowsProcessed: number;
  rowsModified: number;
  executionTimeMs: number;
}

export interface ValidationScript {
  id: string;
  name: string;
  description: string;
  type: ScriptType;
  targetFields: string[];  // Which HubSpot fields this script operates on
  isEnabled: boolean;
  order: number;  // Execution order
}

export interface ScriptRunnerResult {
  totalScripts: number;
  scriptsRun: number;
  scriptResults: ScriptResult[];
  totalChanges: number;
  totalErrors: number;
  totalWarnings: number;
  processedData: ParsedRow[];
}

// Pipeline types - temporary DB storage for upload processing
export type PipelineSessionStatus =
  | 'uploaded'    // Rows stored, awaiting processing
  | 'enriching'   // Enrichment in progress
  | 'enriched'    // Enrichment complete, awaiting sync
  | 'syncing'     // Pushing to HubSpot
  | 'completed'   // Successfully synced, rows deleted
  | 'failed'      // Sync failed, rows retained for retry
  | 'expired';    // Past retention, rows purged

export type PipelineRowStatus =
  | 'pending'     // Awaiting enrichment
  | 'enriching'   // Enrichment in progress
  | 'enriched'    // Enrichment complete
  | 'syncing'     // Being pushed to HubSpot
  | 'synced'      // Successfully sent (will be deleted)
  | 'failed';     // Sync failed

export interface PipelineSession {
  id: string;
  accountId: string;
  userId?: string;
  fileName: string;
  status: PipelineSessionStatus;
  totalRows: number;
  processedRows: number;
  enrichedRows: number;
  syncedRows: number;
  failedRows: number;
  errorMessage?: string;
  fieldMappings: Record<string, string>; // csvHeader -> hubspotField
  enrichmentConfigIds: string[];
  retryCount: number;
  maxRetries: number;
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineRow {
  id: string;
  sessionId: string;
  rowIndex: number;
  rawData: Record<string, unknown>;
  enrichedData: Record<string, unknown>;
  status: PipelineRowStatus;
  hubspotContactId?: string;
  hubspotCompanyId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineProgress {
  sessionId: string;
  status: PipelineSessionStatus;
  totalRows: number;
  processedRows: number;
  enrichedRows: number;
  syncedRows: number;
  failedRows: number;
  errorMessage?: string;
  retryCount: number;
  expiresAt: string;
}
