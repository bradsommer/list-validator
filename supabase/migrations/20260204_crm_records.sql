-- CRM Records & Custom Properties
-- Stores contacts, companies, and deals from uploads with 15-day retention.
-- Records are deduplicated by email (contacts), domain (companies), deal name (deals).

-- ============================================================================
-- CRM CUSTOM PROPERTIES (per object type)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  object_type VARCHAR(50) NOT NULL, -- 'contacts', 'companies', 'deals'
  name VARCHAR(255) NOT NULL,       -- Internal name (snake_case, e.g. 'institution_id')
  label VARCHAR(255) NOT NULL,      -- Display label (e.g. 'Institution ID')
  field_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, number, date, select, boolean
  options JSONB DEFAULT '[]',       -- For select fields: [{value, label}]
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE for built-in fields that can't be deleted
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, object_type, name)
);

CREATE INDEX IF NOT EXISTS idx_crm_properties_account_type ON crm_properties(account_id, object_type);

-- ============================================================================
-- CRM RECORDS (contacts, companies, deals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  object_type VARCHAR(50) NOT NULL, -- 'contacts', 'companies', 'deals'
  properties JSONB NOT NULL DEFAULT '{}', -- {propertyName: value}
  dedup_key VARCHAR(500),           -- email for contacts, domain for companies, deal_name for deals
  hubspot_record_id VARCHAR(255),   -- HubSpot record ID after sync
  upload_session_id UUID,           -- Last upload session that touched this record
  synced_at TIMESTAMP WITH TIME ZONE, -- When last synced to HubSpot
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_records_account_type ON crm_records(account_id, object_type);
CREATE INDEX IF NOT EXISTS idx_crm_records_dedup ON crm_records(account_id, object_type, dedup_key);
CREATE INDEX IF NOT EXISTS idx_crm_records_expires ON crm_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_crm_records_hubspot_id ON crm_records(hubspot_record_id);
CREATE INDEX IF NOT EXISTS idx_crm_records_properties ON crm_records USING gin(properties);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_crm_properties_updated_at ON crm_properties;
CREATE TRIGGER update_crm_properties_updated_at
  BEFORE UPDATE ON crm_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_records_updated_at ON crm_records;
CREATE TRIGGER update_crm_records_updated_at
  BEFORE UPDATE ON crm_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE crm_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON crm_properties FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON crm_records FOR ALL TO authenticated USING (true);

-- Development policies (remove in production)
CREATE POLICY "Allow all for anon" ON crm_properties FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON crm_records FOR ALL TO anon USING (true);

-- ============================================================================
-- SEED: Default system properties for each object type
-- ============================================================================

-- Contacts system properties
INSERT INTO crm_properties (account_id, object_type, name, label, field_type, is_system, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'email', 'Email', 'text', TRUE, 0),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'firstname', 'First Name', 'text', TRUE, 1),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'lastname', 'Last Name', 'text', TRUE, 2),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'phone', 'Phone', 'text', TRUE, 3),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'company', 'Company', 'text', TRUE, 4),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'jobtitle', 'Job Title', 'text', TRUE, 5),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'city', 'City', 'text', TRUE, 6),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'state', 'State/Region', 'text', TRUE, 7),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'country', 'Country', 'text', TRUE, 8),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'zip', 'Postal Code', 'text', TRUE, 9),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'website', 'Website', 'text', TRUE, 10),
  ('00000000-0000-0000-0000-000000000001', 'contacts', 'address', 'Street Address', 'text', TRUE, 11)
ON CONFLICT (account_id, object_type, name) DO NOTHING;

-- Companies system properties
INSERT INTO crm_properties (account_id, object_type, name, label, field_type, is_system, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'companies', 'name', 'Company Name', 'text', TRUE, 0),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'domain', 'Domain', 'text', TRUE, 1),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'city', 'City', 'text', TRUE, 2),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'state', 'State/Region', 'text', TRUE, 3),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'country', 'Country', 'text', TRUE, 4),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'phone', 'Phone', 'text', TRUE, 5),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'industry', 'Industry', 'text', TRUE, 6),
  ('00000000-0000-0000-0000-000000000001', 'companies', 'website', 'Website', 'text', TRUE, 7)
ON CONFLICT (account_id, object_type, name) DO NOTHING;

-- Deals system properties
INSERT INTO crm_properties (account_id, object_type, name, label, field_type, is_system, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'deals', 'dealname', 'Deal Name', 'text', TRUE, 0),
  ('00000000-0000-0000-0000-000000000001', 'deals', 'amount', 'Amount', 'number', TRUE, 1),
  ('00000000-0000-0000-0000-000000000001', 'deals', 'dealstage', 'Deal Stage', 'text', TRUE, 2),
  ('00000000-0000-0000-0000-000000000001', 'deals', 'pipeline', 'Pipeline', 'text', TRUE, 3),
  ('00000000-0000-0000-0000-000000000001', 'deals', 'closedate', 'Close Date', 'date', TRUE, 4),
  ('00000000-0000-0000-0000-000000000001', 'deals', 'description', 'Description', 'text', TRUE, 5)
ON CONFLICT (account_id, object_type, name) DO NOTHING;
