import Fuse from 'fuse.js';
import type { FieldMapping, HeaderMatch } from '@/types';

// Default field mappings for common HubSpot fields
export const defaultFieldMappings: Omit<FieldMapping, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    hubspotField: 'firstname',
    hubspotLabel: 'First Name',
    variants: ['first_name', 'firstname', 'first name', 'fname', 'given name', 'givenname'],
    isRequired: false,
  },
  {
    hubspotField: 'lastname',
    hubspotLabel: 'Last Name',
    variants: ['last_name', 'lastname', 'last name', 'lname', 'surname', 'family name', 'familyname'],
    isRequired: false,
  },
  {
    hubspotField: 'email',
    hubspotLabel: 'Email',
    variants: ['email', 'email_address', 'emailaddress', 'e-mail', 'email address', 'contact email'],
    isRequired: true,
  },
  {
    hubspotField: 'phone',
    hubspotLabel: 'Phone Number',
    variants: ['phone', 'phone_number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'contact number'],
    isRequired: false,
  },
  {
    hubspotField: 'company',
    hubspotLabel: 'Company Name',
    variants: ['company', 'company_name', 'companyname', 'organization', 'org', 'institution', 'employer', 'business'],
    isRequired: false,
  },
  {
    hubspotField: 'jobtitle',
    hubspotLabel: 'Job Title',
    variants: ['job_title', 'jobtitle', 'title', 'position', 'role', 'job title', 'designation'],
    isRequired: false,
  },
  {
    hubspotField: 'city',
    hubspotLabel: 'City',
    variants: ['city', 'town', 'locality'],
    isRequired: false,
  },
  {
    hubspotField: 'state',
    hubspotLabel: 'State/Region',
    variants: ['state', 'region', 'province', 'state/region', 'state_region'],
    isRequired: false,
  },
  {
    hubspotField: 'country',
    hubspotLabel: 'Country',
    variants: ['country', 'nation', 'country/region'],
    isRequired: false,
  },
  {
    hubspotField: 'zip',
    hubspotLabel: 'Postal Code',
    variants: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode', 'postcode'],
    isRequired: false,
  },
  {
    hubspotField: 'website',
    hubspotLabel: 'Website',
    variants: ['website', 'url', 'web', 'site', 'homepage', 'domain'],
    isRequired: false,
  },
  {
    hubspotField: 'address',
    hubspotLabel: 'Street Address',
    variants: ['address', 'street', 'street_address', 'address1', 'address_1', 'street address'],
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

    // First, try exact match
    const exactMatch = searchItems.find(
      (item) => item.variant === normalizedHeader && !usedFieldIds.has(item.mapping.id)
    );

    if (exactMatch) {
      usedFieldIds.add(exactMatch.mapping.id);
      results.push({
        originalHeader: header,
        matchedField: exactMatch.mapping,
        confidence: 1,
        isMatched: true,
      });
      continue;
    }

    // Try fuzzy match (skip fields already mapped)
    const fuzzyResults = fuse.search(normalizedHeader);
    const bestAvailable = fuzzyResults.find(
      (r) => !usedFieldIds.has(r.item.mapping.id)
    );

    if (bestAvailable && bestAvailable.score !== undefined) {
      const confidence = 1 - (bestAvailable.score || 0);

      if (confidence >= 0.6) {
        usedFieldIds.add(bestAvailable.item.mapping.id);
      }

      results.push({
        originalHeader: header,
        matchedField: bestAvailable.item.mapping,
        confidence,
        isMatched: confidence >= 0.6,
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
