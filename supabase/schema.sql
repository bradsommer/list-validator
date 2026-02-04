-- Ascend HubSpot List Validator - Supabase Schema
-- SECURITY-FOCUSED: No PII storage. All contact data processed in-memory only.
-- This schema stores: users, configuration data, field mappings, AI models, enrichment rules.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ACCOUNTS (Multi-tenant: each company has its own account)
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);

-- ============================================================================
-- USER MANAGEMENT (Admin-managed accounts, no email verification)
-- ============================================================================

-- Users table - managed by admin, no email required
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username for login
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);

-- Sessions table for token-based auth
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on token for session lookup
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- ============================================================================
-- AI MODELS CONFIGURATION (Secure key storage)
-- ============================================================================

-- AI models table - stores model configurations with encrypted API keys
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'google', 'serp', etc.
  model_id VARCHAR(255) NOT NULL, -- e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro'
  api_key_encrypted TEXT, -- Encrypted API key (null if using env var)
  use_env_key BOOLEAN DEFAULT FALSE, -- Use environment variable instead
  env_key_name VARCHAR(255), -- Name of env var if use_env_key is true
  base_url VARCHAR(500), -- Optional custom endpoint
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on provider
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);

-- ============================================================================
-- FIELD MAPPINGS (Header -> HubSpot field mappings)
-- ============================================================================

-- Default HubSpot fields configuration
CREATE TABLE IF NOT EXISTS hubspot_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'firstname'
  field_label VARCHAR(255) NOT NULL, -- e.g., 'First Name'
  field_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'date', etc.
  is_required BOOLEAN DEFAULT FALSE,
  is_custom BOOLEAN DEFAULT FALSE, -- User-added custom field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Header mappings - stores learned header -> field associations
CREATE TABLE IF NOT EXISTS header_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_header VARCHAR(500) NOT NULL, -- The header from uploaded file
  normalized_header VARCHAR(500) NOT NULL, -- Lowercase, trimmed version
  hubspot_field_id UUID NOT NULL REFERENCES hubspot_fields(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) DEFAULT 1.0, -- Mapping confidence (0-1)
  usage_count INTEGER DEFAULT 1, -- How many times this mapping was used
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(normalized_header, hubspot_field_id)
);

-- Create indexes for header mappings
CREATE INDEX IF NOT EXISTS idx_header_mappings_normalized ON header_mappings(normalized_header);
CREATE INDEX IF NOT EXISTS idx_header_mappings_hubspot_field ON header_mappings(hubspot_field_id);

-- ============================================================================
-- ENRICHMENT CONFIGURATIONS
-- ============================================================================

-- Enrichment configurations with AI model selection
CREATE TABLE IF NOT EXISTS enrichment_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ai_model_id UUID REFERENCES ai_models(id), -- Which AI model to use
  prompt_template TEXT NOT NULL, -- Prompt with {{field_name}} placeholders
  input_fields TEXT[] NOT NULL DEFAULT '{}', -- Fields to use in prompt
  output_field VARCHAR(255) NOT NULL, -- Where to store result
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  execution_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- VALIDATION SCRIPTS CONFIGURATION
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_validation_scripts_script_id ON validation_scripts(script_id);

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ACCOUNT INTEGRATIONS (Per-account OAuth integrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL, -- 'hubspot', 'salesforce', etc.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at BIGINT, -- Unix timestamp ms
  portal_id VARCHAR(255), -- Provider-specific account ID (e.g. HubSpot portal ID)
  metadata JSONB DEFAULT '{}', -- Extra provider-specific data
  connected_by UUID REFERENCES users(id),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_account_integrations_account ON account_integrations(account_id);
CREATE INDEX IF NOT EXISTS idx_account_integrations_provider ON account_integrations(provider);

-- ============================================================================
-- AUDIT LOG (Anonymized - no PII)
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
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
  error_types JSONB DEFAULT '{}',
  warning_types JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_import_audit_log_timestamp ON import_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_import_audit_log_user_id ON import_audit_log(user_id);

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

-- Function to hash password
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_models_updated_at ON ai_models;
CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON ai_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hubspot_fields_updated_at ON hubspot_fields;
CREATE TRIGGER update_hubspot_fields_updated_at
  BEFORE UPDATE ON hubspot_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_header_mappings_updated_at ON header_mappings;
CREATE TRIGGER update_header_mappings_updated_at
  BEFORE UPDATE ON header_mappings
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

DROP TRIGGER IF EXISTS update_account_integrations_updated_at ON account_integrations;
CREATE TRIGGER update_account_integrations_updated_at
  BEFORE UPDATE ON account_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default account
INSERT INTO accounts (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Account', 'default')
ON CONFLICT (slug) DO NOTHING;

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users (username, password_hash, display_name, role, account_id) VALUES
  ('admin@example.com', crypt('admin123', gen_salt('bf', 12)), 'Administrator', 'admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (username) DO NOTHING;

-- Insert default HubSpot fields
INSERT INTO hubspot_fields (field_name, field_label, field_type, is_required) VALUES
  ('firstname', 'First Name', 'string', FALSE),
  ('lastname', 'Last Name', 'string', FALSE),
  ('email', 'Email', 'string', TRUE),
  ('phone', 'Phone Number', 'string', FALSE),
  ('company', 'Company Name', 'string', FALSE),
  ('jobtitle', 'Job Title', 'string', FALSE),
  ('city', 'City', 'string', FALSE),
  ('state', 'State/Region', 'string', FALSE),
  ('country', 'Country', 'string', FALSE),
  ('zip', 'Postal Code', 'string', FALSE),
  ('website', 'Website', 'string', FALSE),
  ('address', 'Street Address', 'string', FALSE)
ON CONFLICT (field_name) DO NOTHING;

-- Insert default header mappings (common variations)
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'First Name', 'first name', id, 1.0 FROM hubspot_fields WHERE field_name = 'firstname'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'FirstName', 'firstname', id, 1.0 FROM hubspot_fields WHERE field_name = 'firstname'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'first_name', 'first_name', id, 1.0 FROM hubspot_fields WHERE field_name = 'firstname'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'fname', 'fname', id, 1.0 FROM hubspot_fields WHERE field_name = 'firstname'
ON CONFLICT DO NOTHING;

INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Last Name', 'last name', id, 1.0 FROM hubspot_fields WHERE field_name = 'lastname'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'LastName', 'lastname', id, 1.0 FROM hubspot_fields WHERE field_name = 'lastname'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'last_name', 'last_name', id, 1.0 FROM hubspot_fields WHERE field_name = 'lastname'
ON CONFLICT DO NOTHING;

INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Email', 'email', id, 1.0 FROM hubspot_fields WHERE field_name = 'email'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Email Address', 'email address', id, 1.0 FROM hubspot_fields WHERE field_name = 'email'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'email_address', 'email_address', id, 1.0 FROM hubspot_fields WHERE field_name = 'email'
ON CONFLICT DO NOTHING;

INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Phone', 'phone', id, 1.0 FROM hubspot_fields WHERE field_name = 'phone'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Phone Number', 'phone number', id, 1.0 FROM hubspot_fields WHERE field_name = 'phone'
ON CONFLICT DO NOTHING;

INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Company', 'company', id, 1.0 FROM hubspot_fields WHERE field_name = 'company'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Company Name', 'company name', id, 1.0 FROM hubspot_fields WHERE field_name = 'company'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Organization', 'organization', id, 1.0 FROM hubspot_fields WHERE field_name = 'company'
ON CONFLICT DO NOTHING;

INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Job Title', 'job title', id, 1.0 FROM hubspot_fields WHERE field_name = 'jobtitle'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Title', 'title', id, 1.0 FROM hubspot_fields WHERE field_name = 'jobtitle'
ON CONFLICT DO NOTHING;

INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'State', 'state', id, 1.0 FROM hubspot_fields WHERE field_name = 'state'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'City', 'city', id, 1.0 FROM hubspot_fields WHERE field_name = 'city'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Country', 'country', id, 1.0 FROM hubspot_fields WHERE field_name = 'country'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Zip', 'zip', id, 1.0 FROM hubspot_fields WHERE field_name = 'zip'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Zip Code', 'zip code', id, 1.0 FROM hubspot_fields WHERE field_name = 'zip'
ON CONFLICT DO NOTHING;
INSERT INTO header_mappings (original_header, normalized_header, hubspot_field_id, confidence)
SELECT 'Postal Code', 'postal code', id, 1.0 FROM hubspot_fields WHERE field_name = 'zip'
ON CONFLICT DO NOTHING;

-- Insert default AI model (SERP API using env var)
INSERT INTO ai_models (name, provider, model_id, use_env_key, env_key_name, is_default, description) VALUES
  ('SERP API', 'serp', 'google', TRUE, 'SERP_API_KEY', TRUE, 'Google Search via SERP API for company lookups')
ON CONFLICT DO NOTHING;

-- Insert default enrichment configs with prompt templates
INSERT INTO enrichment_configs (name, description, prompt_template, input_fields, output_field, is_enabled, execution_order) VALUES
  (
    'Find Official Company Name',
    'Use search to find the official company/institution name',
    'Find the official company name for: {{company}} located in {{city}}, {{state}}',
    ARRAY['company', 'city', 'state'],
    'official_company_name',
    TRUE,
    10
  ),
  (
    'Find Company Domain',
    'Use search to find the company website domain',
    'Find the official website domain for: {{company}} ({{official_company_name}})',
    ARRAY['company', 'official_company_name'],
    'domain',
    TRUE,
    20
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
  ('session_timeout_minutes', '60')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow all for authenticated" ON accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON user_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON ai_models FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON hubspot_fields FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON header_mappings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON enrichment_configs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON validation_scripts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON account_integrations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON import_audit_log FOR ALL TO authenticated USING (true);

-- Development policies (remove in production)
CREATE POLICY "Allow all for anon" ON accounts FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON users FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON user_sessions FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON ai_models FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON hubspot_fields FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON header_mappings FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON enrichment_configs FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON validation_scripts FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON account_integrations FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON import_audit_log FOR ALL TO anon USING (true);
