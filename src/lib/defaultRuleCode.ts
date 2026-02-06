/**
 * Default JavaScript code for each rule.
 * These are simplified versions of the built-in TypeScript scripts that can be
 * stored in the database and executed dynamically.
 *
 * Each function follows the signature:
 * - transform(value, fieldName, row) => newValue
 * - validate(value, fieldName, row) => { valid: boolean, message?: string }
 */

export const DEFAULT_RULE_CODE: Record<string, string> = {
  'state-normalization': `
// US State abbreviation to full name mapping
const STATE_MAP = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
  'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam'
};

const VALID_STATE_NAMES = new Set(Object.values(STATE_MAP));

function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Already a valid full state name
  if (VALID_STATE_NAMES.has(valueStr)) return valueStr;

  const upperValue = valueStr.toUpperCase();

  // Check if it's a state abbreviation
  if (STATE_MAP[upperValue]) {
    return STATE_MAP[upperValue];
  }

  // Try case-insensitive match against full names
  for (const stateName of VALID_STATE_NAMES) {
    if (stateName.toUpperCase() === upperValue) {
      return stateName;
    }
  }

  return value;
}
`,

  'whitespace-validation': `
const VALUE_LOOKUP = {
  'yes': 'Yes', 'no': 'No', 'y': 'Yes', 'n': 'No',
  'true': 'Yes', 'false': 'No', '1': 'Yes', '0': 'No'
};

function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '' || valueStr === 'Yes' || valueStr === 'No') return valueStr;

  const normalized = VALUE_LOOKUP[valueStr.toLowerCase()];
  return normalized || '';
}
`,

  'new-business-validation': `
const VALUE_LOOKUP = {
  'yes': 'Yes', 'no': 'No', 'y': 'Yes', 'n': 'No',
  'true': 'Yes', 'false': 'No', '1': 'Yes', '0': 'No'
};

function validate(value, fieldName, row) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: true };
  }

  const valueStr = String(value).trim();
  if (valueStr === 'Yes' || valueStr === 'No') {
    return { valid: true };
  }

  const normalized = VALUE_LOOKUP[valueStr.toLowerCase()];
  if (normalized) {
    return { valid: true };
  }

  return { valid: false, message: '"' + valueStr + '" is not a valid New Business value (expected Yes/No)' };
}
`,

  'role-normalization': `
const VALID_ROLES = [
  'Admin', 'Administrator', 'Ascend Employee', 'ATI Champion', 'ATI Employee',
  'Champion Nominee', 'Coordinator', 'Dean', 'Director', 'Educator',
  'Instructor', 'Other', 'Proctor', 'Student', 'TEAS Student', 'LMS Admin'
];

const ROLE_LOOKUP = {};
VALID_ROLES.forEach(role => { ROLE_LOOKUP[role.toLowerCase()] = role; });

function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Exact match
  if (VALID_ROLES.includes(valueStr)) return valueStr;

  // Case-insensitive match
  const matched = ROLE_LOOKUP[valueStr.toLowerCase()];
  if (matched) return matched;

  // No match - set to Other
  return 'Other';
}
`,

  'program-type-normalization': `
const VALID_VALUES = ['ADN', 'ASN', 'BSN', 'LPN', 'LVN', 'MSN', 'PN', 'RN', 'Other'];
const VALUE_LOOKUP = {};
VALID_VALUES.forEach(v => { VALUE_LOOKUP[v.toLowerCase()] = v; });

function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Exact match
  if (VALID_VALUES.includes(valueStr)) return valueStr;

  // Case-insensitive match
  const matched = VALUE_LOOKUP[valueStr.toLowerCase()];
  if (matched) return matched;

  return 'Other';
}
`,

  'solution-normalization': `
const VALID_VALUES = ['OPTIMAL', 'SUPREME', 'STO', 'CARP', 'BASIC', 'MID-MARKET', 'COMPLETE', 'Other'];
const VALUE_LOOKUP = {};
VALID_VALUES.forEach(v => { VALUE_LOOKUP[v.toLowerCase()] = v; });

function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Exact match
  if (VALID_VALUES.includes(valueStr)) return valueStr;

  // Case-insensitive match
  const matched = VALUE_LOOKUP[valueStr.toLowerCase()];
  if (matched) return matched;

  return 'Other';
}
`,

  'email-validation': `
const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', '10minutemail.com'];

function validate(value, fieldName, row) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: true };
  }

  const email = String(value).trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }

  const domain = email.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, message: 'Disposable email domain detected: ' + domain };
  }

  return { valid: true };
}
`,

  'phone-normalization': `
function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Remove all non-digit characters
  const digits = valueStr.replace(/\\D/g, '');

  // If it has 10 digits, format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  // If it has 11 digits starting with 1, format as +1 (XXX) XXX-XXXX
  if (digits.length === 11 && digits[0] === '1') {
    return '+1 (' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7);
  }

  return value;
}
`,

  'date-normalization': `
function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Try parsing as date
  const date = new Date(valueStr);
  if (!isNaN(date.getTime())) {
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // Try MM/DD/YYYY format
  const mmddyyyy = valueStr.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy;
    return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
  }

  return value;
}
`,

  'name-capitalization': `
function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Handle special prefixes like Mc, Mac, O'
  return valueStr
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.startsWith("mc") && word.length > 2) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3);
      }
      if (word.startsWith("mac") && word.length > 3) {
        return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4);
      }
      if (word.startsWith("o'") && word.length > 2) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
`,

  'company-normalization': `
const SUFFIX_MAP = {
  'inc': 'Inc.', 'inc.': 'Inc.', 'incorporated': 'Inc.',
  'llc': 'LLC', 'l.l.c.': 'LLC', 'l.l.c': 'LLC',
  'corp': 'Corp.', 'corp.': 'Corp.', 'corporation': 'Corp.',
  'ltd': 'Ltd.', 'ltd.': 'Ltd.', 'limited': 'Ltd.',
  'co': 'Co.', 'co.': 'Co.', 'company': 'Co.'
};

function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;
  const valueStr = String(value).trim();
  if (valueStr === '') return value;

  // Split into words
  const words = valueStr.split(/\\s+/);
  const result = words.map((word, i) => {
    const lower = word.toLowerCase();
    // Check for suffix normalization (usually at end)
    if (i === words.length - 1 && SUFFIX_MAP[lower]) {
      return SUFFIX_MAP[lower];
    }
    // Title case other words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return result.join(' ');
}
`,

  'duplicate-detection': `
function validate(value, fieldName, row) {
  // Duplicate detection needs access to all rows, which isn't available
  // in the simple per-value validation model. This is a placeholder.
  // Real duplicate detection should be done at the batch level.
  return { valid: true };
}
`,
};

/**
 * Get the default code for a rule by its ID
 */
export function getDefaultRuleCode(ruleId: string): string | null {
  return DEFAULT_RULE_CODE[ruleId] || null;
}

/**
 * Check if a rule has default code available
 */
export function hasDefaultRuleCode(ruleId: string): boolean {
  return ruleId in DEFAULT_RULE_CODE;
}
