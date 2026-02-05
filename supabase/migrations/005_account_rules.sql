-- Account-level rule management
-- Rules are defined in TypeScript but configured per-account in this table

CREATE TABLE IF NOT EXISTS account_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,  -- matches script id like 'state-normalization'
  enabled BOOLEAN DEFAULT true,
  name TEXT NOT NULL,  -- display name
  description TEXT,  -- account-specific description (can override default)
  rule_type TEXT NOT NULL CHECK (rule_type IN ('transform', 'validate')),
  target_fields TEXT[],  -- which fields this rule operates on
  config JSONB DEFAULT '{}',  -- optional config overrides (e.g., valid values)
  display_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, rule_id)
);

-- Index for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_account_rules_account_id ON account_rules(account_id);

-- Seed default rules for the default account
-- These match the existing TypeScript scripts in /src/lib/scripts/
INSERT INTO account_rules (account_id, rule_id, name, description, rule_type, target_fields, display_order, config)
VALUES
  ('default', 'state-normalization', 'State Normalization',
   'Converts state abbreviations (AL, CA, NY) to full names (Alabama, California, New York). Also fixes common misspellings and case variations.',
   'transform', ARRAY['state'], 10, '{}'),

  ('default', 'whitespace-validation', 'Whitespace Cleanup',
   'Removes leading/trailing whitespace and normalizes multiple spaces to single spaces in text fields.',
   'transform', ARRAY['*'], 12, '{}'),

  ('default', 'new-business-validation', 'New Business Flag',
   'Validates the New Business field contains only "Yes" or "No" values.',
   'validate', ARRAY['new_business'], 13, '{}'),

  ('default', 'role-normalization', 'Role Normalization',
   'Validates role values against an allowed list (Admin, Educator, Student, etc.). Non-matching values are set to "Other".',
   'transform', ARRAY['role'], 15,
   '{"validValues": ["Admin", "Administrator", "Ascend Employee", "ATI Champion", "ATI Employee", "Champion Nominee", "Coordinator", "Dean", "Director", "Educator", "Instructor", "Other", "Proctor", "Student", "TEAS Student", "LMS Admin"]}'),

  ('default', 'program-type-normalization', 'Program Type Normalization',
   'Normalizes program type values to a standard list (ADN, ASN, BSN, LPN, etc.). Non-matching values are set to "Other".',
   'transform', ARRAY['program_type'], 16,
   '{"validValues": ["ADN", "ASN", "BSN", "LPN", "LVN", "MSN", "PN", "RN", "Other"]}'),

  ('default', 'solution-normalization', 'Solution Normalization',
   'Validates solution values against an allowed list (OPTIMAL, SUPREME, STO, CARP, BASIC, MID-MARKET, COMPLETE). Non-matching values are set to "Other".',
   'transform', ARRAY['solution'], 17,
   '{"validValues": ["OPTIMAL", "SUPREME", "STO", "CARP", "BASIC", "MID-MARKET", "COMPLETE"]}'),

  ('default', 'email-validation', 'Email Validation',
   'Validates email format and checks for common issues like missing @ symbol, invalid domains, or typos in common domains (gmail, yahoo, etc.).',
   'validate', ARRAY['email'], 20, '{}'),

  ('default', 'phone-normalization', 'Phone Normalization',
   'Formats phone numbers to a consistent format and validates they contain valid digits.',
   'transform', ARRAY['phone'], 30, '{}'),

  ('default', 'date-normalization', 'Date Normalization',
   'Parses various date formats and normalizes them to ISO format (YYYY-MM-DD). Handles formats like MM/DD/YYYY, DD-MM-YYYY, etc.',
   'transform', ARRAY['date'], 35, '{}'),

  ('default', 'name-capitalization', 'Name Capitalization',
   'Capitalizes first and last names properly, handling edge cases like McDonald, O''Brien, etc.',
   'transform', ARRAY['firstname', 'lastname'], 50, '{}'),

  ('default', 'company-normalization', 'Company Normalization',
   'Standardizes company name formatting and common abbreviations (Inc., LLC, Corp., etc.).',
   'transform', ARRAY['company'], 60, '{}'),

  ('default', 'duplicate-detection', 'Duplicate Detection',
   'Identifies potential duplicate records based on email address or name + company combination.',
   'validate', ARRAY['email', 'firstname', 'lastname', 'company'], 100, '{}')
ON CONFLICT (account_id, rule_id) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS account_rules_updated_at ON account_rules;
CREATE TRIGGER account_rules_updated_at
  BEFORE UPDATE ON account_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_account_rules_updated_at();
