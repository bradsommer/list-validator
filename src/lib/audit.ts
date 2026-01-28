import type { ParsedRow, HeaderMatch, AuditFlag, AuditResult, HubSpotMatchResult } from '@/types';

// Audit thresholds
const CONFIDENCE_THRESHOLD = 0.7; // Matches below this are flagged for review
const FUZZY_MATCH_THRESHOLD = 0.8; // Company name matches below this are flagged

// Flag rows with low-confidence header matches
function auditHeaderMatches(headerMatches: HeaderMatch[]): AuditFlag[] {
  const flags: AuditFlag[] = [];

  headerMatches.forEach((match) => {
    if (match.isMatched && match.confidence < CONFIDENCE_THRESHOLD) {
      flags.push({
        rowIndex: 0, // Header row
        field: match.originalHeader,
        reason: `Low confidence header match (${Math.round(match.confidence * 100)}%)`,
        suggestedValue: match.matchedField?.hubspotLabel,
        confidence: match.confidence,
      });
    }
  });

  return flags;
}

// Flag rows with low-confidence company matches
function auditCompanyMatches(matchResults: HubSpotMatchResult[]): AuditFlag[] {
  const flags: AuditFlag[] = [];

  matchResults.forEach((result) => {
    if (result.matchType === 'fuzzy_name' && result.matchConfidence < FUZZY_MATCH_THRESHOLD) {
      flags.push({
        rowIndex: result.rowIndex,
        field: 'company',
        reason: `Low confidence company match (${Math.round(result.matchConfidence * 100)}%)`,
        suggestedValue: result.matchedCompany?.name,
        confidence: result.matchConfidence,
      });
    }

    if (result.matchType === 'no_match') {
      flags.push({
        rowIndex: result.rowIndex,
        field: 'company',
        reason: 'No matching company found in HubSpot',
        confidence: 0,
      });
    }

    if (result.matchType === 'created_new') {
      flags.push({
        rowIndex: result.rowIndex,
        field: 'company',
        reason: `New company created: ${result.matchedCompany?.name}`,
        confidence: 1,
      });
    }
  });

  return flags;
}

// Flag rows with potential data quality issues
function auditDataQuality(rows: ParsedRow[], headerMatches: HeaderMatch[]): AuditFlag[] {
  const flags: AuditFlag[] = [];

  // Create a mapping from original header to hubspot field
  const headerToHubspot = new Map<string, string>();
  headerMatches.forEach((match) => {
    if (match.matchedField) {
      headerToHubspot.set(match.originalHeader, match.matchedField.hubspotField);
    }
  });

  rows.forEach((row, index) => {
    // Check for suspicious email patterns
    const emailHeader = Array.from(headerToHubspot.entries())
      .find(([_, hubspot]) => hubspot === 'email')?.[0];

    if (emailHeader && row[emailHeader]) {
      const email = String(row[emailHeader]).toLowerCase();

      // Flag generic/personal emails
      if (email.includes('@gmail.') || email.includes('@yahoo.') ||
          email.includes('@hotmail.') || email.includes('@outlook.')) {
        flags.push({
          rowIndex: index,
          field: 'email',
          reason: 'Personal email address detected - may want business email',
          confidence: 0.8,
        });
      }

      // Flag suspicious patterns
      if (email.includes('test') || email.includes('example') || email.includes('fake')) {
        flags.push({
          rowIndex: index,
          field: 'email',
          reason: 'Potentially invalid email (contains test/example/fake)',
          confidence: 0.6,
        });
      }
    }

    // Check for missing names
    const firstNameHeader = Array.from(headerToHubspot.entries())
      .find(([_, hubspot]) => hubspot === 'firstname')?.[0];
    const lastNameHeader = Array.from(headerToHubspot.entries())
      .find(([_, hubspot]) => hubspot === 'lastname')?.[0];

    const firstName = firstNameHeader ? String(row[firstNameHeader] || '').trim() : '';
    const lastName = lastNameHeader ? String(row[lastNameHeader] || '').trim() : '';

    if (!firstName && !lastName) {
      flags.push({
        rowIndex: index,
        field: 'name',
        reason: 'Both first and last name are missing',
        confidence: 0.9,
      });
    }

    // Check for all-caps names (data quality issue)
    if (firstName && firstName === firstName.toUpperCase() && firstName.length > 1) {
      flags.push({
        rowIndex: index,
        field: 'firstname',
        reason: 'First name is all uppercase',
        suggestedValue: firstName.charAt(0) + firstName.slice(1).toLowerCase(),
        confidence: 0.7,
      });
    }

    if (lastName && lastName === lastName.toUpperCase() && lastName.length > 1) {
      flags.push({
        rowIndex: index,
        field: 'lastname',
        reason: 'Last name is all uppercase',
        suggestedValue: lastName.charAt(0) + lastName.slice(1).toLowerCase(),
        confidence: 0.7,
      });
    }
  });

  return flags;
}

// Run full audit
export function runAudit(
  rows: ParsedRow[],
  headerMatches: HeaderMatch[],
  matchResults?: HubSpotMatchResult[]
): AuditResult {
  const allFlags: AuditFlag[] = [];

  // Audit header matches
  allFlags.push(...auditHeaderMatches(headerMatches));

  // Audit data quality
  allFlags.push(...auditDataQuality(rows, headerMatches));

  // Audit company matches if available
  if (matchResults) {
    allFlags.push(...auditCompanyMatches(matchResults));
  }

  // Determine which rows are clean vs need review
  const flaggedRowIndices = new Set(allFlags.map((f) => f.rowIndex));
  const cleanRows: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (!flaggedRowIndices.has(i)) {
      cleanRows.push(i);
    }
  }

  // Count auto-resolved (high confidence flags that can be auto-fixed)
  const autoResolved = allFlags.filter(
    (f) => f.confidence >= 0.9 && f.suggestedValue
  ).length;

  return {
    flaggedRows: allFlags,
    cleanRows,
    reviewRequired: flaggedRowIndices.size,
    autoResolved,
  };
}

// Apply automatic fixes for high-confidence issues
export function applyAutoFixes(rows: ParsedRow[], auditResult: AuditResult): ParsedRow[] {
  const updatedRows = [...rows];

  auditResult.flaggedRows.forEach((flag) => {
    if (flag.confidence >= 0.9 && flag.suggestedValue && flag.rowIndex >= 0) {
      const row = updatedRows[flag.rowIndex];
      if (row && flag.field in row) {
        row[flag.field] = flag.suggestedValue;
      }
    }
  });

  return updatedRows;
}

// Get audit summary
export function getAuditSummary(auditResult: AuditResult): {
  totalRows: number;
  cleanRows: number;
  flaggedRows: number;
  autoResolved: number;
  flagsByReason: Record<string, number>;
} {
  const flagsByReason: Record<string, number> = {};

  auditResult.flaggedRows.forEach((flag) => {
    const reason = flag.reason.split(' - ')[0]; // Get main reason
    flagsByReason[reason] = (flagsByReason[reason] || 0) + 1;
  });

  return {
    totalRows: auditResult.cleanRows.length + auditResult.reviewRequired,
    cleanRows: auditResult.cleanRows.length,
    flaggedRows: auditResult.reviewRequired,
    autoResolved: auditResult.autoResolved,
    flagsByReason,
  };
}

// Export clean data only
export function getCleanData(rows: ParsedRow[], auditResult: AuditResult): ParsedRow[] {
  return auditResult.cleanRows.map((index) => rows[index]);
}

// Export flagged data for review
export function getFlaggedData(
  rows: ParsedRow[],
  auditResult: AuditResult
): { row: ParsedRow; flags: AuditFlag[] }[] {
  const flaggedRowIndices = new Set(auditResult.flaggedRows.map((f) => f.rowIndex));
  const result: { row: ParsedRow; flags: AuditFlag[] }[] = [];

  flaggedRowIndices.forEach((index) => {
    if (index >= 0 && index < rows.length) {
      result.push({
        row: rows[index],
        flags: auditResult.flaggedRows.filter((f) => f.rowIndex === index),
      });
    }
  });

  return result;
}
