-- Migration: Store HubSpot properties in DB instead of file cache
-- Properties are fetched once on OAuth connect, then refreshed manually

CREATE TABLE IF NOT EXISTS hubspot_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_label VARCHAR(500) NOT NULL,
  field_type VARCHAR(100) NOT NULL,
  group_name VARCHAR(255),
  object_type VARCHAR(50) NOT NULL,
  description TEXT,
  hubspot_type VARCHAR(100),
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one property per field_name + object_type per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_hubspot_properties_unique
  ON hubspot_properties(account_id, object_type, field_name);

CREATE INDEX IF NOT EXISTS idx_hubspot_properties_account
  ON hubspot_properties(account_id);

CREATE INDEX IF NOT EXISTS idx_hubspot_properties_object_type
  ON hubspot_properties(account_id, object_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_hubspot_properties_updated_at ON hubspot_properties;
CREATE TRIGGER update_hubspot_properties_updated_at
  BEFORE UPDATE ON hubspot_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE hubspot_properties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all for authenticated" ON hubspot_properties FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all for anon" ON hubspot_properties FOR ALL TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
