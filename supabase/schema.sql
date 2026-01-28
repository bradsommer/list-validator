-- Ascend HubSpot List Validator - Supabase Schema
-- SECURITY-FOCUSED: No PII storage. All contact data processed in-memory only.
-- This schema only stores configuration data (field mappings, enrichment rules, validation scripts).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONFIGURATION TABLES (No PII - safe to persist)
-- ============================================================================

-- Field mappings table - stores header-to-HubSpot field mapping rules
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hubspot_field VARCHAR(255) NOT NULL,
  hubspot_label VARCHAR(255) NOT NULL,
  variants TEXT[] NOT NULL DEFAULT '{}',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on hubspot_field
CREATE INDEX IF NOT EXISTS idx_field_mappings_hubspot_field ON field_mappings(hubspot_field);

-- Enrichment configurations table - stores enrichment rule definitions
CREATE TABLE IF NOT EXISTS enrichment_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt TEXT,
  input_fields TEXT[] NOT NULL DEFAULT '{}',
  output_field VARCHAR(255) NOT NULL,
  service VARCHAR(50) NOT NULL DEFAULT 'serp',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation scripts configuration table - stores script enable/disable state
CREATE TABLE IF NOT EXISTS validation_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  script_type VARCHAR(50) NOT NULL DEFAULT 'transform',
  target_fields TEXT[] NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  execution_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on script_id
CREATE INDEX IF NOT EXISTS idx_validation_scripts_script_id ON validation_scripts(script_id);

-- App settings table - general application settings (no PII)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG TABLE (Anonymized - no PII)
-- Only stores aggregate statistics, never individual contact data
-- ============================================================================

-- Import audit log - tracks import operations without storing contact data
CREATE TABLE IF NOT EXISTS import_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  auto_corrected_count INTEGER NOT NULL DEFAULT 0,
  scripts_run TEXT[] DEFAULT '{}',
  hubspot_contacts_created INTEGER NOT NULL DEFAULT 0,
  hubspot_contacts_updated INTEGER NOT NULL DEFAULT 0,
  hubspot_companies_created INTEGER NOT NULL DEFAULT 0,
  hubspot_tasks_created INTEGER NOT NULL DEFAULT 0,
  -- No PII: only store counts and metadata
  error_types JSONB DEFAULT '{}',  -- e.g., {"invalid_email": 5, "missing_required": 3}
  warning_types JSONB DEFAULT '{}'
);

-- Create index on timestamp for querying recent imports
CREATE INDEX IF NOT EXISTS idx_import_audit_log_timestamp ON import_audit_log(timestamp DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_field_mappings_updated_at ON field_mappings;
CREATE TRIGGER update_field_mappings_updated_at
  BEFORE UPDATE ON field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrichment_configs_updated_at ON enrichment_configs;
CREATE TRIGGER update_enrichment_configs_updated_at
  BEFORE UPDATE ON enrichment_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_validation_scripts_updated_at ON validation_scripts;
CREATE TRIGGER update_validation_scripts_updated_at
  BEFORE UPDATE ON validation_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default field mappings
INSERT INTO field_mappings (hubspot_field, hubspot_label, variants, is_required) VALUES
  ('firstname', 'First Name', ARRAY['first_name', 'firstname', 'first name', 'fname', 'given name', 'givenname'], FALSE),
  ('lastname', 'Last Name', ARRAY['last_name', 'lastname', 'last name', 'lname', 'surname', 'family name', 'familyname'], FALSE),
  ('email', 'Email', ARRAY['email', 'email_address', 'emailaddress', 'e-mail', 'email address', 'contact email'], TRUE),
  ('phone', 'Phone Number', ARRAY['phone', 'phone_number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'contact number'], FALSE),
  ('company', 'Company Name', ARRAY['company', 'company_name', 'companyname', 'organization', 'org', 'institution', 'employer', 'business'], FALSE),
  ('jobtitle', 'Job Title', ARRAY['job_title', 'jobtitle', 'title', 'position', 'role', 'job title', 'designation'], FALSE),
  ('city', 'City', ARRAY['city', 'town', 'locality'], FALSE),
  ('state', 'State/Region', ARRAY['state', 'region', 'province', 'state/region', 'state_region'], FALSE),
  ('country', 'Country', ARRAY['country', 'nation', 'country/region'], FALSE),
  ('zip', 'Postal Code', ARRAY['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode', 'postcode'], FALSE),
  ('website', 'Website', ARRAY['website', 'url', 'web', 'site', 'homepage', 'domain'], FALSE),
  ('address', 'Street Address', ARRAY['address', 'street', 'street_address', 'address1', 'address_1', 'street address'], FALSE)
ON CONFLICT DO NOTHING;

-- Insert default enrichment configs
INSERT INTO enrichment_configs (name, description, prompt, input_fields, output_field, service, is_enabled) VALUES
  (
    'Find Official Company Name',
    'Use SERP API to find the official company/institution name',
    'Given a user''s email address, city, state, and institution, find the official company name',
    ARRAY['email', 'city', 'state', 'institution'],
    'official_company_name',
    'serp',
    TRUE
  ),
  (
    'Find Company Domain',
    'Use SERP API to find the company/institution domain',
    'Given a user''s email address, city, state, and institution, find the company domain',
    ARRAY['email', 'city', 'state', 'institution'],
    'domain',
    'serp',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Insert default validation scripts
INSERT INTO validation_scripts (script_id, name, description, script_type, target_fields, is_enabled, execution_order) VALUES
  ('state-normalization', 'State Normalization', 'Converts state abbreviations to full names and fixes misspellings', 'transform', ARRAY['state'], TRUE, 10),
  ('email-validation', 'Email Validation', 'Validates email format and flags personal/disposable domains', 'validate', ARRAY['email'], TRUE, 20),
  ('phone-normalization', 'Phone Normalization', 'Standardizes phone formats to (XXX) XXX-XXXX', 'transform', ARRAY['phone'], TRUE, 30),
  ('name-capitalization', 'Name Capitalization', 'Properly capitalizes names (McDonald, O''Brien, etc.)', 'transform', ARRAY['firstname', 'lastname'], TRUE, 50),
  ('company-normalization', 'Company Normalization', 'Standardizes company names and suffixes (Inc., LLC, Ltd.)', 'transform', ARRAY['company'], TRUE, 60),
  ('duplicate-detection', 'Duplicate Detection', 'Identifies duplicate entries by email, name, or phone', 'validate', ARRAY['email', 'firstname', 'lastname', 'phone'], TRUE, 100)
ON CONFLICT (script_id) DO NOTHING;

-- Insert default app settings
INSERT INTO app_settings (key, value) VALUES
  ('default_task_assignee', '""'),
  ('hubspot_portal_id', '""'),
  ('enrichment_services', '{"serp": true, "clearbit": false}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON field_mappings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON enrichment_configs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON validation_scripts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON import_audit_log FOR ALL TO authenticated USING (true);

-- Development policies (remove in production)
CREATE POLICY "Allow all for anon" ON field_mappings FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON enrichment_configs FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON validation_scripts FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON import_audit_log FOR ALL TO anon USING (true);
