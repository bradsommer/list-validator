import type { HeaderMatch } from '@/types';
import type { ParsedRow } from '@/types';

/**
 * Common header name patterns for each field type.
 * Used as a fallback when headerMatches detection misses a column.
 */
const HEADER_PATTERNS: Record<string, string[]> = {
  // State patterns — only compound forms; standalone "region" and "province" are too broad
  state: ['state/province', 'state province', 'state/region', 'state region', 'state_province', 'state_region', 'mailing state', 'billing state', 'home state', 'work state', 'state'],
  solution: ['solution type', 'solution_type', 'solutiontype', 'solution'],
  email: ['email', 'e-mail', 'email address', 'email_address'],
  phone: ['phone', 'phone number', 'phone_number', 'telephone', 'tel', 'mobile', 'cell', 'cell phone', 'mobile phone'],
  firstname: ['first name', 'first_name', 'firstname', 'first', 'given name', 'given_name'],
  lastname: ['last name', 'last_name', 'lastname', 'last', 'surname', 'family name', 'family_name'],
  company: ['company', 'company name', 'company_name', 'organization', 'organisation', 'org'],
  role: ['role', 'user role', 'user_role', 'account role'],
  program_type: ['program type', 'program_type', 'programtype', 'program'],
  whitespace: ['whitespace'],
  new_business: ['new business', 'new_business', 'newbusiness'],
  date: ['date', 'created date', 'close date', 'start date', 'end date', 'birthday', 'birthdate'],
  city: ['city', 'town'],
  zip: ['zip', 'zipcode', 'zip code', 'postal code', 'postal_code'],
  country: ['country', 'nation'],
  address: ['address', 'street', 'street address'],
  title: ['title', 'job title', 'job_title', 'position'],
  website: ['website', 'url', 'web', 'homepage'],
  deal_name: ['deal name', 'deal_name', 'deal', 'opportunity'],
  amount: ['amount', 'deal amount', 'value', 'revenue', 'price'],
  region: ['region', 'sales region', 'sales_region', 'geographic region'],
};

/**
 * Find the actual column header for a given field type.
 *
 * Strategy:
 * 1. Check headerMatches for detected matches (prefer highest confidence)
 * 2. Fallback: scan row keys directly for common header name patterns
 *
 * This dual approach ensures scripts work even if column auto-detection
 * missed the column (e.g., due to stale cache or unusual header names).
 */
export function findColumnHeader(
  fieldName: string,
  headerMatches: HeaderMatch[],
  rows: ParsedRow[]
): string | null {
  // 1. Standard approach: check headerMatches, preferring highest confidence
  // When multiple columns match the same field (e.g., "State" and "Address 1: State/Province"),
  // we want the one with highest confidence (exact match = 1.0 beats partial = 0.8)
  const matches = headerMatches.filter(
    (m) => m.matchedField?.hubspotField === fieldName
  );

  if (matches.length > 0) {
    // Sort by confidence (highest first)
    matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return matches[0].originalHeader;
  }

  // 2. Direct column name match — if fieldName is an actual column header, use it directly
  if (rows.length > 0) {
    const rowKeys = Object.keys(rows[0]);
    // Exact match
    if (rowKeys.includes(fieldName)) {
      return fieldName;
    }
    // Case-insensitive match
    const lowerField = fieldName.toLowerCase();
    const directMatch = rowKeys.find((k) => k.toLowerCase() === lowerField);
    if (directMatch) {
      return directMatch;
    }
  }

  // 3. Fallback: scan row keys for known patterns
  if (rows.length === 0) {
    return null;
  }

  const patterns = HEADER_PATTERNS[fieldName];
  if (!patterns) {
    return null;
  }

  const rowKeys = Object.keys(rows[0]);

  // First pass: exact match after normalization
  for (const key of rowKeys) {
    const normalizedKey = key.toLowerCase().trim().replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ');

    if (patterns.includes(normalizedKey)) {
      return key;
    }

    // Partial match: normalized key contains a pattern
    for (const pattern of patterns) {
      if (normalizedKey.includes(pattern)) {
        return key;
      }
    }
  }

  // Second pass: simple case-insensitive substring match on ANY pattern
  // This catches cases where normalization might have issues
  for (const key of rowKeys) {
    const keyLower = key.toLowerCase();
    for (const pattern of patterns) {
      if (keyLower.includes(pattern)) {
        return key;
      }
    }
  }

  return null;
}
