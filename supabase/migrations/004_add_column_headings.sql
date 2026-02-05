-- Migration: Add column headings and mapping history tables
-- These tables store user-defined HubSpot column headings and remember
-- how spreadsheet headers were mapped in previous imports.

-- ============================================================================
-- COLUMN HEADINGS (per account)
-- ============================================================================

CREATE TABLE IF NOT EXISTS column_headings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each account can only have one heading with a given name
  UNIQUE(account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_column_headings_account ON column_headings(account_id);

-- ============================================================================
-- COLUMN MAPPING HISTORY (per account)
-- Remembers spreadsheet_header -> hubspot_heading mappings from previous imports
-- ============================================================================

CREATE TABLE IF NOT EXISTS column_mapping_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  spreadsheet_header VARCHAR(500) NOT NULL,
  hubspot_heading VARCHAR(255) NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each account can only have one mapping per spreadsheet header
  UNIQUE(account_id, spreadsheet_header)
);

CREATE INDEX IF NOT EXISTS idx_column_mapping_history_account ON column_mapping_history(account_id);

-- ============================================================================
-- DISABLED VALIDATION RULES (per account)
-- Only stores disabled script IDs; all scripts enabled by default
-- ============================================================================

CREATE TABLE IF NOT EXISTS disabled_validation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  script_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(account_id, script_id)
);

CREATE INDEX IF NOT EXISTS idx_disabled_validation_rules_account ON disabled_validation_rules(account_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_column_headings_updated_at ON column_headings;
CREATE TRIGGER update_column_headings_updated_at
  BEFORE UPDATE ON column_headings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_column_mapping_history_updated_at ON column_mapping_history;
CREATE TRIGGER update_column_mapping_history_updated_at
  BEFORE UPDATE ON column_mapping_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE column_headings ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_mapping_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE disabled_validation_rules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their account's data
DO $$ BEGIN
  CREATE POLICY "Users can manage their account column_headings"
    ON column_headings FOR ALL TO authenticated
    USING (account_id IN (
      SELECT account_id FROM users WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage their account column_mapping_history"
    ON column_mapping_history FOR ALL TO authenticated
    USING (account_id IN (
      SELECT account_id FROM users WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage their account disabled_validation_rules"
    ON disabled_validation_rules FOR ALL TO authenticated
    USING (account_id IN (
      SELECT account_id FROM users WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow anon access for development/testing
DO $$ BEGIN
  CREATE POLICY "Allow anon column_headings" ON column_headings FOR ALL TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon column_mapping_history" ON column_mapping_history FOR ALL TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon disabled_validation_rules" ON disabled_validation_rules FOR ALL TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
