import Fuse from 'fuse.js';
import type { FieldMapping, HeaderMatch } from '@/types';

// Default field mappings for common HubSpot fields
export const defaultFieldMappings: Omit<FieldMapping, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    hubspotField: 'firstname',
    hubspotLabel: 'First Name',
    variants: ['first_name', 'firstname', 'first name', 'fname', 'given name', 'givenname'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'lastname',
    hubspotLabel: 'Last Name',
    variants: ['last_name', 'lastname', 'last name', 'lname', 'surname', 'family name', 'familyname'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'email',
    hubspotLabel: 'Email',
    variants: ['email', 'email_address', 'emailaddress', 'e-mail', 'email address', 'contact email'],
    objectType: 'contacts',
    isRequired: true,
  },
  {
    hubspotField: 'phone',
    hubspotLabel: 'Phone Number',
    variants: ['phone', 'phone_number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'contact number'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'company',
    hubspotLabel: 'Company Name',
    variants: ['company', 'company_name', 'companyname', 'organization', 'org', 'institution', 'employer', 'business'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'jobtitle',
    hubspotLabel: 'Job Title',
    variants: ['job_title', 'jobtitle', 'title', 'position', 'role', 'job title', 'designation'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'city',
    hubspotLabel: 'City',
    variants: ['city', 'town', 'locality'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'state',
    hubspotLabel: 'State/Region',
    variants: ['state', 'region', 'province', 'state/region', 'state_region'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'country',
    hubspotLabel: 'Country',
    variants: ['country', 'nation', 'country/region'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'zip',
    hubspotLabel: 'Postal Code',
    variants: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode', 'postcode'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'website',
    hubspotLabel: 'Website',
    variants: ['website', 'url', 'web', 'site', 'homepage', 'domain'],
    objectType: 'contacts',
    isRequired: false,
  },
  {
    hubspotField: 'address',
    hubspotLabel: 'Street Address',
    variants: ['address', 'street', 'street_address', 'address1', 'address_1', 'street address'],
    objectType: 'contacts',
    isRequired: false,
  },
];

// Normalize string for comparison
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

// Object type priority: contacts first, then companies, then deals
const OBJECT_TYPE_PRIORITY: Record<string, number> = {
  contacts: 0,
  companies: 1,
  deals: 2,
};

function getObjectTypePriority(objectType: string): number {
  return OBJECT_TYPE_PRIORITY[objectType] ?? 3;
}

// Match headers to field mappings using fuzzy matching
export function matchHeaders(
  headers: string[],
  fieldMappings: FieldMapping[]
): HeaderMatch[] {
  const results: HeaderMatch[] = [];

  // Create a searchable list of all variants
  const searchItems = fieldMappings.flatMap((mapping) =>
    mapping.variants.map((variant) => ({
      variant: normalizeString(variant),
      mapping,
    }))
  );

  // Configure Fuse for fuzzy searching
  const fuse = new Fuse(searchItems, {
    keys: ['variant'],
    threshold: 0.4, // Lower = stricter matching
    includeScore: true,
  });

  // Track which HubSpot fields have already been mapped to prevent duplicates
  const usedFieldIds = new Set<string>();

  for (const header of headers) {
    const normalizedHeader = normalizeString(header);

    // First, try exact match — prefer contact properties over company/deal
    const exactMatches = searchItems.filter(
      (item) => item.variant === normalizedHeader && !usedFieldIds.has(item.mapping.id)
    );

    if (exactMatches.length > 0) {
      // Sort by object type priority: contacts > companies > deals
      exactMatches.sort((a, b) =>
        getObjectTypePriority(a.mapping.objectType) - getObjectTypePriority(b.mapping.objectType)
      );
      const bestExact = exactMatches[0];
      usedFieldIds.add(bestExact.mapping.id);
      results.push({
        originalHeader: header,
        matchedField: bestExact.mapping,
        confidence: 1,
        isMatched: true,
      });
      continue;
    }

    // Try fuzzy match (skip fields already mapped)
    // Prioritize contact properties when scores are close
    const fuzzyResults = fuse.search(normalizedHeader);
    const availableResults = fuzzyResults.filter(
      (r) => !usedFieldIds.has(r.item.mapping.id)
    );

    // Among results with similar scores (within 0.1), prefer contact > company > deal
    let bestAvailable = availableResults[0];
    if (bestAvailable && bestAvailable.score !== undefined) {
      const bestScore = bestAvailable.score;
      const closeMatches = availableResults.filter(
        (r) => r.score !== undefined && r.score - bestScore < 0.1
      );
      if (closeMatches.length > 1) {
        closeMatches.sort((a, b) =>
          getObjectTypePriority(a.item.mapping.objectType) - getObjectTypePriority(b.item.mapping.objectType)
        );
        bestAvailable = closeMatches[0];
      }
    }

    if (bestAvailable && bestAvailable.score !== undefined) {
      const confidence = 1 - (bestAvailable.score || 0);

      // Always pre-select the best guess — mark as matched if confidence is
      // reasonable (>= 0.4) so users see the suggestion and can verify/change it.
      // Reserve the field to prevent duplicate assignments.
      const isSuggested = confidence >= 0.4;
      if (isSuggested) {
        usedFieldIds.add(bestAvailable.item.mapping.id);
      }

      results.push({
        originalHeader: header,
        matchedField: bestAvailable.item.mapping,
        confidence,
        isMatched: isSuggested,
      });
    } else {
      results.push({
        originalHeader: header,
        matchedField: null,
        confidence: 0,
        isMatched: false,
      });
    }
  }

  return results;
}

// Fuzzy match company names for HubSpot company matching
export function fuzzyMatchCompanyName(
  searchName: string,
  companies: { id: string; name: string }[]
): { company: { id: string; name: string } | null; confidence: number } {
  if (!searchName || companies.length === 0) {
    return { company: null, confidence: 0 };
  }

  const fuse = new Fuse(companies, {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(searchName);

  if (results.length > 0 && results[0].score !== undefined) {
    const confidence = 1 - results[0].score;
    return {
      company: results[0].item,
      confidence,
    };
  }

  return { company: null, confidence: 0 };
}
