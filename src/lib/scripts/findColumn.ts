import type { HeaderMatch } from '@/types';
import type { ParsedRow } from '@/types';

/**
 * Common header name patterns for each field type.
 * Used as a fallback when headerMatches detection misses a column.
 */
const HEADER_PATTERNS: Record<string, string[]> = {
  state: ['state', 'state/province', 'state province', 'state/region', 'state region', 'province', 'region'],
  solution: ['solution', 'solution type', 'solution_type'],
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
};

/**
 * Find the actual column header for a given field type.
 *
 * Strategy:
 * 1. Check headerMatches for a detected match (standard approach)
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
  // 1. Standard approach: check headerMatches
  const match = headerMatches.find(
    (m) => m.matchedField?.hubspotField === fieldName
  );
  if (match) {
    return match.originalHeader;
  }

  // 2. Fallback: scan row keys for known patterns
  if (rows.length === 0) return null;

  const patterns = HEADER_PATTERNS[fieldName];
  if (!patterns) return null;

  const rowKeys = Object.keys(rows[0]);
  for (const key of rowKeys) {
    const normalizedKey = key.toLowerCase().trim().replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ');

    // Exact match against patterns
    if (patterns.includes(normalizedKey)) {
      return key;
    }

    // Partial match: key contains a pattern (for compound headers like "Address 1: State/Province")
    for (const pattern of patterns) {
      if (normalizedKey.includes(pattern)) {
        return key;
      }
    }
  }

  return null;
}
