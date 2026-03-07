-- Migration: Restore account_integrations and app_settings tables
-- These were incorrectly dropped in 20260204_remove_unused_tables.sql
-- but are still actively used for HubSpot OAuth token persistence and
-- OAuth credential storage.

-- ============================================================================
-- APP SETTINGS (stores OAuth credentials like hubspot_client_id)
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
-- RLS policies
-- ============================================================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow all for authenticated') THEN
    CREATE POLICY "Allow all for authenticated" ON app_settings FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON app_settings FOR ALL TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_integrations' AND policyname = 'Allow all for authenticated') THEN
    CREATE POLICY "Allow all for authenticated" ON account_integrations FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_integrations' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON account_integrations FOR ALL TO anon USING (true);
  END IF;
END $$;

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_integrations_updated_at ON account_integrations;
CREATE TRIGGER update_account_integrations_updated_at
  BEFORE UPDATE ON account_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
