-- Migration: Create all validation rules as custom code in database
-- This replaces hardcoded TypeScript scripts with database-driven rules
-- All rules are fully editable through the admin UI

-- First, clear existing rules for 'default' account to ensure clean state
DELETE FROM account_rules WHERE account_id = 'default';

-- Insert all rules with their custom code

-- 1. State Normalization (order: 10)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'state-normalization',
  'State Normalization',
  'Converts state abbreviations to full names and fixes common misspellings',
  'transform',
  ARRAY['state'],
  10,
  true,
  '{"code": "// State Normalization - Converts abbreviations to full names\nfunction transform(value, fieldName, row) {\n  if (!value) return value;\n\n  const STATE_MAP = {\n    \"AL\": \"Alabama\", \"AK\": \"Alaska\", \"AZ\": \"Arizona\", \"AR\": \"Arkansas\",\n    \"CA\": \"California\", \"CO\": \"Colorado\", \"CT\": \"Connecticut\", \"DE\": \"Delaware\",\n    \"FL\": \"Florida\", \"GA\": \"Georgia\", \"HI\": \"Hawaii\", \"ID\": \"Idaho\",\n    \"IL\": \"Illinois\", \"IN\": \"Indiana\", \"IA\": \"Iowa\", \"KS\": \"Kansas\",\n    \"KY\": \"Kentucky\", \"LA\": \"Louisiana\", \"ME\": \"Maine\", \"MD\": \"Maryland\",\n    \"MA\": \"Massachusetts\", \"MI\": \"Michigan\", \"MN\": \"Minnesota\", \"MS\": \"Mississippi\",\n    \"MO\": \"Missouri\", \"MT\": \"Montana\", \"NE\": \"Nebraska\", \"NV\": \"Nevada\",\n    \"NH\": \"New Hampshire\", \"NJ\": \"New Jersey\", \"NM\": \"New Mexico\", \"NY\": \"New York\",\n    \"NC\": \"North Carolina\", \"ND\": \"North Dakota\", \"OH\": \"Ohio\", \"OK\": \"Oklahoma\",\n    \"OR\": \"Oregon\", \"PA\": \"Pennsylvania\", \"RI\": \"Rhode Island\", \"SC\": \"South Carolina\",\n    \"SD\": \"South Dakota\", \"TN\": \"Tennessee\", \"TX\": \"Texas\", \"UT\": \"Utah\",\n    \"VT\": \"Vermont\", \"VA\": \"Virginia\", \"WA\": \"Washington\", \"WV\": \"West Virginia\",\n    \"WI\": \"Wisconsin\", \"WY\": \"Wyoming\", \"DC\": \"District of Columbia\",\n    \"PR\": \"Puerto Rico\", \"VI\": \"Virgin Islands\", \"GU\": \"Guam\"\n  };\n\n  const STATE_VARIANTS = {\n    \"CALI\": \"California\", \"CALIF\": \"California\", \"CALIFRONIA\": \"California\",\n    \"NEWYORK\": \"New York\", \"NYC\": \"New York\", \"TEXS\": \"Texas\",\n    \"FLORDA\": \"Florida\", \"FLORDIA\": \"Florida\", \"GEORIGA\": \"Georgia\",\n    \"ILLNOIS\": \"Illinois\", \"ILLINIOS\": \"Illinois\", \"MASSACHUSETS\": \"Massachusetts\",\n    \"MICHGAN\": \"Michigan\", \"MINNESOTTA\": \"Minnesota\", \"MISSIPPI\": \"Mississippi\",\n    \"MISOURI\": \"Missouri\", \"CONNETICUT\": \"Connecticut\", \"PENNSLVANIA\": \"Pennsylvania\",\n    \"TENNESSE\": \"Tennessee\", \"VIRGINA\": \"Virginia\", \"WASHINTON\": \"Washington\"\n  };\n\n  const VALID_STATES = new Set(Object.values(STATE_MAP));\n\n  const valueStr = String(value).trim();\n  const upperValue = valueStr.toUpperCase();\n\n  if (VALID_STATES.has(valueStr)) return valueStr;\n  if (STATE_MAP[upperValue]) return STATE_MAP[upperValue];\n  if (STATE_VARIANTS[upperValue]) return STATE_VARIANTS[upperValue];\n\n  for (const stateName of VALID_STATES) {\n    if (stateName.toUpperCase() === upperValue) return stateName;\n  }\n\n  return value;\n}"}'::jsonb
);

-- 2. Whitespace Validation (order: 12)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'whitespace-validation',
  'Whitespace Validation',
  'Normalizes Yes/No values for the Whitespace field',
  'transform',
  ARRAY['whitespace'],
  12,
  true,
  '{"code": "// Whitespace Validation - Normalizes Yes/No values\nfunction transform(value, fieldName, row) {\n  if (value === null || value === undefined) return value;\n\n  const VALUE_LOOKUP = {\n    \"yes\": \"Yes\", \"no\": \"No\", \"y\": \"Yes\", \"n\": \"No\",\n    \"true\": \"Yes\", \"false\": \"No\", \"1\": \"Yes\", \"0\": \"No\"\n  };\n\n  const valueStr = String(value).trim();\n  if (valueStr === \"\" || valueStr === \"Yes\" || valueStr === \"No\") return valueStr;\n\n  const normalized = VALUE_LOOKUP[valueStr.toLowerCase()];\n  if (normalized) return normalized;\n\n  return \"\";\n}"}'::jsonb
);

-- 3. New Business Validation (order: 13)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'new-business-validation',
  'New Business Validation',
  'Normalizes Yes/No values for the New Business field',
  'transform',
  ARRAY['new_business'],
  13,
  true,
  '{"code": "// New Business Validation - Normalizes Yes/No values\nfunction transform(value, fieldName, row) {\n  if (value === null || value === undefined) return value;\n\n  const VALUE_LOOKUP = {\n    \"yes\": \"Yes\", \"no\": \"No\", \"y\": \"Yes\", \"n\": \"No\",\n    \"true\": \"Yes\", \"false\": \"No\", \"1\": \"Yes\", \"0\": \"No\"\n  };\n\n  const valueStr = String(value).trim();\n  if (valueStr === \"\" || valueStr === \"Yes\" || valueStr === \"No\") return valueStr;\n\n  const normalized = VALUE_LOOKUP[valueStr.toLowerCase()];\n  if (normalized) return normalized;\n\n  return \"\";\n}"}'::jsonb
);

-- 4. Role Normalization (order: 15)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'role-normalization',
  'Role Normalization',
  'Validates and normalizes role values against allowed list',
  'transform',
  ARRAY['role'],
  15,
  true,
  '{"code": "// Role Normalization - Validates against allowed list\nfunction transform(value, fieldName, row) {\n  if (!value) return value;\n\n  const VALID_ROLES = [\n    \"Admin\", \"Administrator\", \"Ascend Employee\", \"ATI Champion\", \"ATI Employee\",\n    \"Champion Nominee\", \"Coordinator\", \"Dean\", \"Director\", \"Educator\",\n    \"Instructor\", \"Other\", \"Proctor\", \"Student\", \"TEAS Student\", \"LMS Admin\"\n  ];\n\n  const ROLE_LOOKUP = {};\n  VALID_ROLES.forEach(r => ROLE_LOOKUP[r.toLowerCase()] = r);\n\n  const valueStr = String(value).trim();\n  if (valueStr === \"\") return value;\n\n  if (VALID_ROLES.includes(valueStr)) return valueStr;\n\n  const matched = ROLE_LOOKUP[valueStr.toLowerCase()];\n  if (matched) return matched;\n\n  return \"Other\";\n}"}'::jsonb
);

-- 5. Program Type Normalization (order: 16)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'program-type-normalization',
  'Program Type Normalization',
  'Validates and normalizes program type values against allowed list',
  'transform',
  ARRAY['program_type'],
  16,
  true,
  '{"code": "// Program Type Normalization - Validates against allowed list\nfunction transform(value, fieldName, row) {\n  if (!value) return value;\n\n  const VALID_TYPES = [\n    \"ADN\", \"BSN\", \"OTHER-BSN\", \"RN\", \"PN\", \"Allied Health\", \"Diploma\", \"Other\",\n    \"Testing Center\", \"ATI Allied Health\", \"RN to BSN\", \"APRN\", \"Healthcare\",\n    \"Bookstore\", \"LPN\", \"DNP\", \"MSN\", \"CNA\", \"ADN - Online\", \"BSN - Online\",\n    \"BSN Philippines\", \"CT\", \"CV Sonography\", \"Dental Assisting\", \"Dental Hygiene\",\n    \"HCO\", \"Health Occupations\", \"Healthcare-ADN\", \"Hospital\", \"ICV\", \"LPN to RN\",\n    \"MRI\", \"Medical Assisting\", \"Medical Sonography\", \"NHA Allied Health\",\n    \"Nuclear Medicine\", \"Occupational Assisting\", \"PN - Online\", \"PhD\",\n    \"Physical Therapy\", \"Radiation Therapy\", \"Radiography\", \"Resident\",\n    \"Respiratory Therapy\", \"Sports Medicine\", \"TEAS Only\", \"Test Program Type\",\n    \"Therapeutic Massage\"\n  ];\n\n  const TYPE_LOOKUP = {};\n  VALID_TYPES.forEach(t => TYPE_LOOKUP[t.toLowerCase()] = t);\n\n  const valueStr = String(value).trim();\n  if (valueStr === \"\") return value;\n\n  if (VALID_TYPES.includes(valueStr)) return valueStr;\n\n  const matched = TYPE_LOOKUP[valueStr.toLowerCase()];\n  if (matched) return matched;\n\n  return \"Other\";\n}"}'::jsonb
);

-- 6. Solution Normalization (order: 17)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'solution-normalization',
  'Solution Normalization',
  'Validates and normalizes solution values against allowed list',
  'transform',
  ARRAY['solution'],
  17,
  true,
  '{"code": "// Solution Normalization - Validates against allowed list\nfunction transform(value, fieldName, row) {\n  if (!value) return value;\n\n  const VALID_SOLUTIONS = [\"OPTIMAL\", \"SUPREME\", \"STO\", \"CARP\", \"BASIC\", \"MID-MARKET\", \"COMPLETE\"];\n\n  const SOLUTION_LOOKUP = {};\n  VALID_SOLUTIONS.forEach(s => SOLUTION_LOOKUP[s.toUpperCase()] = s);\n\n  const valueStr = String(value).trim();\n  if (valueStr === \"\") return value;\n\n  if (VALID_SOLUTIONS.includes(valueStr)) return valueStr;\n\n  const matched = SOLUTION_LOOKUP[valueStr.toUpperCase()];\n  if (matched) return matched;\n\n  return \"Other\";\n}"}'::jsonb
);

-- 7. Region Normalization (order: 18)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'region-normalization',
  'Region Normalization',
  'Normalizes region values to: Global, Great Lakes, Northeast, National, Other, South, West',
  'transform',
  ARRAY['region'],
  18,
  true,
  '{"code": "// Region Normalization - Normalizes region values to standard format\nfunction transform(value, fieldName, row) {\n  if (!value) return value;\n\n  const VALID_REGIONS = [\"Global\", \"Great Lakes\", \"Northeast\", \"National\", \"Other\", \"South\", \"West\"];\n  \n  const REGION_LOOKUP = {};\n  VALID_REGIONS.forEach(r => REGION_LOOKUP[r.toLowerCase()] = r);\n\n  const valueStr = String(value).trim();\n  if (valueStr === \"\") return value;\n\n  if (VALID_REGIONS.includes(valueStr)) return valueStr;\n\n  const matched = REGION_LOOKUP[valueStr.toLowerCase()];\n  if (matched) return matched;\n\n  return \"Other\";\n}"}'::jsonb
);

-- 8. Email Validation (order: 20)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'email-validation',
  'Email Validation',
  'Validates email format and checks for disposable domains',
  'validate',
  ARRAY['email'],
  20,
  true,
  '{"code": "// Email Validation - Validates format and checks disposable domains\nfunction validate(value, fieldName, row) {\n  if (!value || String(value).trim() === \"\") {\n    return { valid: true };\n  }\n\n  const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  const DISPOSABLE_DOMAINS = [\"mailinator.com\", \"guerrillamail.com\", \"tempmail.com\", \"throwaway.email\", \"10minutemail.com\"];\n\n  const email = String(value).trim().toLowerCase();\n\n  if (!EMAIL_REGEX.test(email)) {\n    return { valid: false, message: \"Invalid email format\" };\n  }\n\n  const domain = email.split(\"@\")[1];\n  if (DISPOSABLE_DOMAINS.includes(domain)) {\n    return { valid: false, message: \"Disposable email domain: \" + domain };\n  }\n\n  return { valid: true };\n}"}'::jsonb
);

-- 9. Phone Normalization (order: 30)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'phone-normalization',
  'Phone Normalization',
  'Standardizes phone numbers to +1XXXXXXXXXX format',
  'transform',
  ARRAY['phone'],
  30,
  true,
  '{"code": "// Phone Normalization - Standardizes to +1XXXXXXXXXX format\nfunction transform(value, fieldName, row) {\n  if (!value || String(value).trim() === \"\") return value;\n\n  const valueStr = String(value).trim();\n  const digitsOnly = valueStr.replace(/\\D/g, \"\");\n\n  if (digitsOnly.length < 7) return value;\n\n  if (digitsOnly.length === 10) {\n    return \"+1\" + digitsOnly;\n  }\n\n  if (digitsOnly.length === 11 && digitsOnly.startsWith(\"1\")) {\n    return \"+\" + digitsOnly;\n  }\n\n  if (digitsOnly.length > 10 && valueStr.startsWith(\"+\")) {\n    return \"+\" + digitsOnly;\n  }\n\n  if (digitsOnly.length > 10) {\n    return \"+\" + digitsOnly;\n  }\n\n  return \"+1\" + digitsOnly;\n}"}'::jsonb
);

-- 10. Date Normalization (order: 35)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'date-normalization',
  'Date Normalization',
  'Standardizes dates to MM/DD/YYYY format',
  'transform',
  ARRAY['date'],
  35,
  true,
  '{"code": "// Date Normalization - Standardizes to MM/DD/YYYY\nfunction transform(value, fieldName, row) {\n  if (!value || String(value).trim() === \"\") return value;\n\n  const trimmed = String(value).trim();\n\n  if (/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(trimmed)) return trimmed;\n\n  let match = trimmed.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})$/);\n  if (match) {\n    const [, y, m, d] = match;\n    return m.padStart(2, \"0\") + \"/\" + d.padStart(2, \"0\") + \"/\" + y;\n  }\n\n  match = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);\n  if (match) {\n    const [, m, d, y] = match;\n    return m.padStart(2, \"0\") + \"/\" + d.padStart(2, \"0\") + \"/\" + y;\n  }\n\n  match = trimmed.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2})$/);\n  if (match) {\n    const [, m, d, y] = match;\n    const fullYear = parseInt(y) > 50 ? 1900 + parseInt(y) : 2000 + parseInt(y);\n    return m.padStart(2, \"0\") + \"/\" + d.padStart(2, \"0\") + \"/\" + fullYear;\n  }\n\n  return value;\n}"}'::jsonb
);

-- 11. Name Capitalization (order: 50)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'name-capitalization',
  'Name Capitalization',
  'Properly capitalizes names, handling McDonald, O''Brien, van der Berg, etc.',
  'transform',
  ARRAY['firstname', 'lastname'],
  50,
  true,
  '{"code": "// Name Capitalization - Properly capitalizes names\nfunction transform(value, fieldName, row) {\n  if (!value || String(value).trim() === \"\") return value;\n\n  const LOWERCASE_PREFIXES = [\"van\", \"von\", \"de\", \"del\", \"della\", \"di\", \"da\", \"du\", \"la\", \"le\", \"el\"];\n  const SPECIAL_PREFIXES = { \"mc\": \"Mc\", \"mac\": \"Mac\", \"o''\": \"O''\" };\n\n  function capitalize(word) {\n    if (!word) return word;\n    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();\n  }\n\n  function processWord(word, isLast) {\n    const lower = word.toLowerCase();\n\n    for (const [prefix, formatted] of Object.entries(SPECIAL_PREFIXES)) {\n      if (lower.startsWith(prefix) && lower.length > prefix.length) {\n        const rest = word.substring(prefix.length);\n        return formatted + capitalize(rest);\n      }\n    }\n\n    if (isLast && LOWERCASE_PREFIXES.includes(lower)) {\n      return lower;\n    }\n\n    return capitalize(word);\n  }\n\n  const name = String(value).trim().replace(/\\s+/g, \" \");\n  const isLastName = fieldName === \"lastname\" || fieldName.toLowerCase().includes(\"last\");\n\n  if (name.includes(\"-\")) {\n    return name.split(\"-\").map((p, i) => processWord(p.trim(), isLastName && i > 0)).join(\"-\");\n  }\n\n  if (name.includes(\" \")) {\n    return name.split(\" \").map((w, i) => processWord(w, isLastName && i > 0)).join(\" \");\n  }\n\n  return processWord(name, isLastName);\n}"}'::jsonb
);

-- 12. Company Normalization (order: 60)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'company-normalization',
  'Company Name Normalization',
  'Standardizes company name formatting, suffixes (Inc., LLC, Ltd.), and acronyms',
  'transform',
  ARRAY['company'],
  60,
  true,
  '{"code": "// Company Normalization - Standardizes company name formatting\nfunction transform(value, fieldName, row) {\n  if (!value || String(value).trim() === \"\") return value;\n\n  const SUFFIXES = {\n    \"inc\": \"Inc.\", \"inc.\": \"Inc.\", \"incorporated\": \"Inc.\",\n    \"llc\": \"LLC\", \"l.l.c.\": \"LLC\", \"llp\": \"LLP\",\n    \"ltd\": \"Ltd.\", \"ltd.\": \"Ltd.\", \"limited\": \"Ltd.\",\n    \"corp\": \"Corp.\", \"corp.\": \"Corp.\", \"corporation\": \"Corp.\",\n    \"co\": \"Co.\", \"co.\": \"Co.\", \"company\": \"Co.\",\n    \"plc\": \"PLC\", \"gmbh\": \"GmbH\", \"ag\": \"AG\"\n  };\n\n  const ACRONYMS = [\"ibm\", \"hp\", \"usa\", \"uk\", \"ai\", \"it\", \"hr\", \"api\", \"aws\", \"crm\", \"erp\", \"b2b\", \"b2c\"];\n  const LOWERCASE = [\"a\", \"an\", \"the\", \"and\", \"or\", \"of\", \"for\", \"in\", \"on\", \"at\", \"to\", \"by\"];\n\n  function titleCase(word) {\n    if (!word) return word;\n    if (word.length > 1 && word !== word.toLowerCase() && word !== word.toUpperCase()) {\n      return word;\n    }\n    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();\n  }\n\n  const normalized = String(value).trim().replace(/\\s+/g, \" \");\n  const words = normalized.split(\" \");\n  const processed = [];\n\n  for (let i = 0; i < words.length; i++) {\n    const word = words[i];\n    const lower = word.toLowerCase();\n\n    if (SUFFIXES[lower]) {\n      processed.push(SUFFIXES[lower]);\n    } else if (ACRONYMS.includes(lower)) {\n      processed.push(lower.toUpperCase());\n    } else if (i > 0 && LOWERCASE.includes(lower)) {\n      processed.push(lower);\n    } else {\n      processed.push(titleCase(word));\n    }\n  }\n\n  return processed.join(\" \").replace(/\\s*,\\s*/g, \", \").replace(/\\s+/g, \" \").trim();\n}"}'::jsonb
);

-- 13. Duplicate Detection (order: 100)
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, enabled, config)
VALUES (
  'default',
  'duplicate-detection',
  'Duplicate Detection',
  'Flags potential duplicate records based on email, name, and company',
  'validate',
  ARRAY['email', 'firstname', 'lastname', 'company'],
  100,
  true,
  '{"code": "// Duplicate Detection - Flags potential duplicates\n// Note: Full cross-row duplicate detection is handled by the built-in system\nfunction validate(value, fieldName, row) {\n  return { valid: true };\n}"}'::jsonb
);
