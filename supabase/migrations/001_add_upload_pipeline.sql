-- Migration: Add upload pipeline tables for temporary PII storage
-- Run this against your existing Supabase database

-- ============================================================================
-- UPLOAD SESSIONS & TEMPORARY ROW STORAGE (PII - auto-purged)
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  file_name VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  enriched_rows INTEGER NOT NULL DEFAULT 0,
  synced_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  enrichment_config_ids UUID[] DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_account ON upload_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON upload_sessions(expires_at);

CREATE TABLE IF NOT EXISTS upload_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  enriched_data JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  hubspot_contact_id VARCHAR(255),
  hubspot_company_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_rows_session ON upload_rows(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_rows_status ON upload_rows(status);
CREATE INDEX IF NOT EXISTS idx_upload_rows_session_status ON upload_rows(session_id, status);

-- Triggers
DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON upload_sessions;
CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_upload_rows_updated_at ON upload_rows;
CREATE TRIGGER update_upload_rows_updated_at
  BEFORE UPDATE ON upload_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_rows ENABLE ROW LEVEL SECURITY;

-- Policies (using DO blocks to avoid "already exists" errors)
DO $$ BEGIN
  CREATE POLICY "Allow all for authenticated" ON upload_sessions FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all for authenticated" ON upload_rows FOR ALL TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all for anon" ON upload_sessions FOR ALL TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all for anon" ON upload_rows FOR ALL TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
