import type { HeaderMatch } from '@/types';

/**
 * Known field patterns: maps a canonical field name to common header variants.
 * Used to auto-detect which columns contain email, phone, name, etc.
 */
const FIELD_PATTERNS: Record<string, string[]> = {
  email: ['email', 'e-mail', 'email_address', 'email address', 'emailaddress', 'e_mail'],
  phone: ['phone', 'phone_number', 'phone number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'cell_phone', 'mobile_phone'],
  firstname: ['first_name', 'firstname', 'first name', 'first', 'given_name', 'given name', 'givenname'],
  lastname: ['last_name', 'lastname', 'last name', 'last', 'surname', 'family_name', 'family name', 'familyname'],
  company: ['company', 'company_name', 'company name', 'companyname', 'organization', 'organisation', 'org', 'employer'],
  state: ['state', 'state_province', 'state/province', 'province', 'region', 'state_region'],
  date: ['date', 'created_date', 'create_date', 'close_date', 'closedate', 'start_date', 'end_date', 'birthday', 'birthdate', 'date_of_birth'],
  city: ['city', 'town'],
  zip: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postalcode', 'postal'],
  country: ['country', 'country_region', 'nation'],
  address: ['address', 'street', 'street_address', 'address1', 'address_1'],
  role: ['role', 'user_role', 'user role', 'userrole', 'account_role'],
  title: ['title', 'job_title', 'jobtitle', 'job title', 'position'],
  website: ['website', 'url', 'web', 'homepage', 'domain'],
  deal_name: ['deal_name', 'deal name', 'dealname', 'deal', 'opportunity'],
  amount: ['amount', 'deal_amount', 'value', 'revenue', 'price'],
};

/**
 * Auto-detect column types from raw CSV headers.
 * Returns HeaderMatch objects that validation scripts can consume.
 */
export function autoDetectColumns(headers: string[]): HeaderMatch[] {
  return headers.map((header) => {
    const normalized = header.toLowerCase().trim().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ');

    let bestMatch: { field: string; confidence: number } | null = null;

    for (const [fieldName, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        const normalizedPattern = pattern.replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ');
        if (normalized === normalizedPattern) {
          bestMatch = { field: fieldName, confidence: 1.0 };
          break;
        }
        // Partial match: header contains the pattern
        if (normalized.includes(normalizedPattern) && (!bestMatch || bestMatch.confidence < 0.8)) {
          bestMatch = { field: fieldName, confidence: 0.8 };
        }
      }
      if (bestMatch?.confidence === 1.0) break;
    }

    if (bestMatch) {
      return {
        originalHeader: header,
        isMatched: true,
        confidence: bestMatch.confidence,
        matchedField: {
          hubspotField: bestMatch.field,
          hubspotLabel: header,
          objectType: 'contacts',
        },
      };
    }

    return {
      originalHeader: header,
      isMatched: false,
      confidence: 0,
      matchedField: null,
    };
  });
}
