-- Ascend HubSpot List Validator - Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Field mappings table
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

-- Enrichment configurations table
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

-- Upload sessions table
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'uploading',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on status and user_id
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  level VARCHAR(20) NOT NULL,
  step VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL
);

-- Create indexes for logs
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HubSpot sync results table (for audit trail)
CREATE TABLE IF NOT EXISTS hubspot_sync_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES upload_sessions(id),
  row_index INTEGER NOT NULL,
  contact_email VARCHAR(255),
  contact_id VARCHAR(255),
  company_name VARCHAR(255),
  company_id VARCHAR(255),
  match_type VARCHAR(50),
  match_confidence DECIMAL(3,2),
  task_created BOOLEAN DEFAULT FALSE,
  task_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sync results
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_results_session ON hubspot_sync_results(session_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_results_contact ON hubspot_sync_results(contact_email);

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

DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON upload_sessions;
CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Insert default app settings
INSERT INTO app_settings (key, value) VALUES
  ('default_task_assignee', '""'),
  ('notify_on_new_company', '[]'),
  ('hubspot_portal_id', '""'),
  ('enrichment_services', '{"serp": true, "clearbit": false}')
ON CONFLICT (key) DO NOTHING;

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hubspot_sync_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed for your security requirements)
CREATE POLICY "Allow all for authenticated users" ON field_mappings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON enrichment_configs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON upload_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON app_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON hubspot_sync_results FOR ALL TO authenticated USING (true);

-- Also allow anonymous access for development (remove in production)
CREATE POLICY "Allow all for anon" ON field_mappings FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON enrichment_configs FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON upload_sessions FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON logs FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON app_settings FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON hubspot_sync_results FOR ALL TO anon USING (true);
