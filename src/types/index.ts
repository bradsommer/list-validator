// Field mapping types
export interface FieldMapping {
  id: string;
  hubspotField: string;
  hubspotLabel: string;
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
  service: 'serp' | 'clearbit' | 'custom';
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
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
