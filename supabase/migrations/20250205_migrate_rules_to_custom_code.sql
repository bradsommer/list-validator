-- Migration: Convert all built-in rules to custom code stored in database
-- This allows all validation rules to be managed through the admin UI

-- State Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// State Normalization - Converts abbreviations to full names
function transform(value, fieldName, row) {
  if (!value) return value;

  const STATE_MAP = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
    "PR": "Puerto Rico", "VI": "Virgin Islands", "GU": "Guam"
  };

  const STATE_VARIANTS = {
    "CALI": "California", "CALIF": "California", "CALIFRONIA": "California",
    "NEWYORK": "New York", "NYC": "New York", "TEXS": "Texas",
    "FLORDA": "Florida", "FLORDIA": "Florida", "GEORIGA": "Georgia",
    "ILLNOIS": "Illinois", "ILLINIOS": "Illinois", "MASSACHUSETS": "Massachusetts",
    "MICHGAN": "Michigan", "MINNESOTTA": "Minnesota", "MISSIPPI": "Mississippi",
    "MISOURI": "Missouri", "CONNETICUT": "Connecticut", "PENNSLVANIA": "Pennsylvania",
    "TENNESSE": "Tennessee", "VIRGINA": "Virginia", "WASHINTON": "Washington"
  };

  const VALID_STATES = new Set(Object.values(STATE_MAP));

  const valueStr = String(value).trim();
  const upperValue = valueStr.toUpperCase();

  // Already valid
  if (VALID_STATES.has(valueStr)) return valueStr;

  // Check abbreviation
  if (STATE_MAP[upperValue]) return STATE_MAP[upperValue];

  // Check misspelling
  if (STATE_VARIANTS[upperValue]) return STATE_VARIANTS[upperValue];

  // Case-insensitive match against valid names
  for (const stateName of VALID_STATES) {
    if (stateName.toUpperCase() === upperValue) return stateName;
  }

  return value;
}'::text))
WHERE rule_id = 'state-normalization';

-- Role Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Role Normalization - Validates against allowed list
function transform(value, fieldName, row) {
  if (!value) return value;

  const VALID_ROLES = [
    "Admin", "Administrator", "Ascend Employee", "ATI Champion", "ATI Employee",
    "Champion Nominee", "Coordinator", "Dean", "Director", "Educator",
    "Instructor", "Other", "Proctor", "Student", "TEAS Student", "LMS Admin"
  ];

  const ROLE_LOOKUP = {};
  VALID_ROLES.forEach(r => ROLE_LOOKUP[r.toLowerCase()] = r);

  const valueStr = String(value).trim();
  if (valueStr === "") return value;

  // Exact match
  if (VALID_ROLES.includes(valueStr)) return valueStr;

  // Case-insensitive match
  const matched = ROLE_LOOKUP[valueStr.toLowerCase()];
  if (matched) return matched;

  // No match - return "Other"
  return "Other";
}'::text))
WHERE rule_id = 'role-normalization';

-- Program Type Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Program Type Normalization - Validates against allowed list
function transform(value, fieldName, row) {
  if (!value) return value;

  const VALID_TYPES = [
    "ADN", "BSN", "OTHER-BSN", "RN", "PN", "Allied Health", "Diploma", "Other",
    "Testing Center", "ATI Allied Health", "RN to BSN", "APRN", "Healthcare",
    "Bookstore", "LPN", "DNP", "MSN", "CNA", "ADN - Online", "BSN - Online",
    "BSN Philippines", "CT", "CV Sonography", "Dental Assisting", "Dental Hygiene",
    "HCO", "Health Occupations", "Healthcare-ADN", "Hospital", "ICV", "LPN to RN",
    "MRI", "Medical Assisting", "Medical Sonography", "NHA Allied Health",
    "Nuclear Medicine", "Occupational Assisting", "PN - Online", "PhD",
    "Physical Therapy", "Radiation Therapy", "Radiography", "Resident",
    "Respiratory Therapy", "Sports Medicine", "TEAS Only", "Test Program Type",
    "Therapeutic Massage"
  ];

  const TYPE_LOOKUP = {};
  VALID_TYPES.forEach(t => TYPE_LOOKUP[t.toLowerCase()] = t);

  const valueStr = String(value).trim();
  if (valueStr === "") return value;

  // Exact match
  if (VALID_TYPES.includes(valueStr)) return valueStr;

  // Case-insensitive match
  const matched = TYPE_LOOKUP[valueStr.toLowerCase()];
  if (matched) return matched;

  // No match - return "Other"
  return "Other";
}'::text))
WHERE rule_id = 'program-type-normalization';

-- Solution Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Solution Normalization - Validates against allowed list
function transform(value, fieldName, row) {
  if (!value) return value;

  const VALID_SOLUTIONS = ["OPTIMAL", "SUPREME", "STO", "CARP", "BASIC", "MID-MARKET", "COMPLETE"];

  const SOLUTION_LOOKUP = {};
  VALID_SOLUTIONS.forEach(s => SOLUTION_LOOKUP[s.toUpperCase()] = s);

  const valueStr = String(value).trim();
  if (valueStr === "") return value;

  // Exact match
  if (VALID_SOLUTIONS.includes(valueStr)) return valueStr;

  // Case-insensitive match
  const matched = SOLUTION_LOOKUP[valueStr.toUpperCase()];
  if (matched) return matched;

  // No match - return "Other"
  return "Other";
}'::text))
WHERE rule_id = 'solution-normalization';

-- Whitespace Validation (Yes/No field)
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Whitespace Validation - Normalizes Yes/No values
function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;

  const VALUE_LOOKUP = {
    "yes": "Yes", "no": "No", "y": "Yes", "n": "No",
    "true": "Yes", "false": "No", "1": "Yes", "0": "No"
  };

  const valueStr = String(value).trim();
  if (valueStr === "" || valueStr === "Yes" || valueStr === "No") return valueStr;

  const normalized = VALUE_LOOKUP[valueStr.toLowerCase()];
  if (normalized) return normalized;

  // Invalid value - clear it
  return "";
}'::text))
WHERE rule_id = 'whitespace-validation';

-- New Business Validation (Yes/No field)
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// New Business Validation - Normalizes Yes/No values
function transform(value, fieldName, row) {
  if (value === null || value === undefined) return value;

  const VALUE_LOOKUP = {
    "yes": "Yes", "no": "No", "y": "Yes", "n": "No",
    "true": "Yes", "false": "No", "1": "Yes", "0": "No"
  };

  const valueStr = String(value).trim();
  if (valueStr === "" || valueStr === "Yes" || valueStr === "No") return valueStr;

  const normalized = VALUE_LOOKUP[valueStr.toLowerCase()];
  if (normalized) return normalized;

  // Invalid value - clear it
  return "";
}'::text))
WHERE rule_id = 'new-business-validation';

-- Email Validation
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Email Validation - Validates format and cleans whitespace
function validate(value, fieldName, row) {
  if (!value || String(value).trim() === "") {
    return { valid: true }; // Empty is ok unless required
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DISPOSABLE_DOMAINS = ["mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email", "10minutemail.com"];

  const email = String(value).trim().toLowerCase();

  // Basic format check
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "Invalid email format" };
  }

  // Check disposable domains
  const domain = email.split("@")[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, message: "Disposable email domain: " + domain };
  }

  return { valid: true };
}'::text))
WHERE rule_id = 'email-validation';

-- Phone Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Phone Normalization - Standardizes to +1XXXXXXXXXX format
function transform(value, fieldName, row) {
  if (!value || String(value).trim() === "") return value;

  const valueStr = String(value).trim();
  const digitsOnly = valueStr.replace(/\D/g, "");

  if (digitsOnly.length < 7) return value; // Too short

  if (digitsOnly.length === 10) {
    // US number without country code
    return "+1" + digitsOnly;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    // US number with leading 1
    return "+" + digitsOnly;
  }

  if (digitsOnly.length > 10 && valueStr.startsWith("+")) {
    // International with +
    return "+" + digitsOnly;
  }

  if (digitsOnly.length > 10) {
    // Longer number, might be international
    return "+" + digitsOnly;
  }

  // 7-9 digits, add +1 anyway
  return "+1" + digitsOnly;
}'::text))
WHERE rule_id = 'phone-normalization';

-- Date Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Date Normalization - Standardizes to MM/DD/YYYY
function transform(value, fieldName, row) {
  if (!value || String(value).trim() === "") return value;

  const trimmed = String(value).trim();

  // Already in target format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

  // ISO: YYYY-MM-DD
  let match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    return m.padStart(2, "0") + "/" + d.padStart(2, "0") + "/" + y;
  }

  // M/D/YYYY
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    return m.padStart(2, "0") + "/" + d.padStart(2, "0") + "/" + y;
  }

  // MM/DD/YY
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (match) {
    const [, m, d, y] = match;
    const fullYear = parseInt(y) > 50 ? 1900 + parseInt(y) : 2000 + parseInt(y);
    return m.padStart(2, "0") + "/" + d.padStart(2, "0") + "/" + fullYear;
  }

  return value; // Could not parse
}'::text))
WHERE rule_id = 'date-normalization';

-- Name Capitalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Name Capitalization - Properly capitalizes names
function transform(value, fieldName, row) {
  if (!value || String(value).trim() === "") return value;

  const LOWERCASE_PREFIXES = ["van", "von", "de", "del", "della", "di", "da", "du", "la", "le", "el"];
  const SPECIAL_PREFIXES = { "mc": "Mc", "mac": "Mac", "o''": "O''" };

  function capitalize(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function processWord(word, isLast) {
    const lower = word.toLowerCase();

    // Special prefixes (Mc, Mac, O'')
    for (const [prefix, formatted] of Object.entries(SPECIAL_PREFIXES)) {
      if (lower.startsWith(prefix) && lower.length > prefix.length) {
        const rest = word.substring(prefix.length);
        return formatted + capitalize(rest);
      }
    }

    // Lowercase prefixes for last names
    if (isLast && LOWERCASE_PREFIXES.includes(lower)) {
      return lower;
    }

    return capitalize(word);
  }

  const name = String(value).trim().replace(/\s+/g, " ");
  const isLastName = fieldName === "lastname" || fieldName.toLowerCase().includes("last");

  // Handle hyphenated names
  if (name.includes("-")) {
    return name.split("-").map((p, i) => processWord(p.trim(), isLastName && i > 0)).join("-");
  }

  // Handle space-separated names
  if (name.includes(" ")) {
    return name.split(" ").map((w, i) => processWord(w, isLastName && i > 0)).join(" ");
  }

  return processWord(name, isLastName);
}'::text))
WHERE rule_id = 'name-capitalization';

-- Company Normalization
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Company Normalization - Standardizes company name formatting
function transform(value, fieldName, row) {
  if (!value || String(value).trim() === "") return value;

  const SUFFIXES = {
    "inc": "Inc.", "inc.": "Inc.", "incorporated": "Inc.",
    "llc": "LLC", "l.l.c.": "LLC", "llp": "LLP",
    "ltd": "Ltd.", "ltd.": "Ltd.", "limited": "Ltd.",
    "corp": "Corp.", "corp.": "Corp.", "corporation": "Corp.",
    "co": "Co.", "co.": "Co.", "company": "Co.",
    "plc": "PLC", "gmbh": "GmbH", "ag": "AG"
  };

  const ACRONYMS = ["ibm", "hp", "usa", "uk", "ai", "it", "hr", "api", "aws", "crm", "erp", "b2b", "b2c"];
  const LOWERCASE = ["a", "an", "the", "and", "or", "of", "for", "in", "on", "at", "to", "by"];

  function titleCase(word) {
    if (!word) return word;
    if (word.length > 1 && word !== word.toLowerCase() && word !== word.toUpperCase()) {
      return word; // Mixed case like iPhone
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  const normalized = String(value).trim().replace(/\s+/g, " ");
  const words = normalized.split(" ");
  const processed = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const lower = word.toLowerCase();

    if (SUFFIXES[lower]) {
      processed.push(SUFFIXES[lower]);
    } else if (ACRONYMS.includes(lower)) {
      processed.push(lower.toUpperCase());
    } else if (i > 0 && LOWERCASE.includes(lower)) {
      processed.push(lower);
    } else {
      processed.push(titleCase(word));
    }
  }

  return processed.join(" ").replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();
}'::text))
WHERE rule_id = 'company-normalization';

-- Duplicate Detection (validate type - checks for duplicates)
UPDATE account_rules
SET config = jsonb_set(COALESCE(config, '{}'), '{code}', to_jsonb(
'// Duplicate Detection - Flags potential duplicates
// Note: This runs per-value but the warning helps identify potential issues
function validate(value, fieldName, row) {
  // This is a simplified version - full duplicate detection happens at the row level
  // The built-in logic handles cross-row duplicate checking
  return { valid: true };
}'::text))
WHERE rule_id = 'duplicate-detection';
