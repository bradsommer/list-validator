-- Migration: Restore upload_sessions and upload_rows tables
-- These were incorrectly dropped in 20260204_remove_unused_tables.sql
-- but are still actively used by the import history and dashboard.

-- ============================================================================
-- UPLOAD SESSIONS (import history records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
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
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  file_content TEXT,
  file_type VARCHAR(100),
  file_size INTEGER,
  enabled_rule_count INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_account ON upload_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON upload_sessions(expires_at);

-- ============================================================================
-- UPLOAD ROWS (per-row data for sessions)
-- ============================================================================

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

-- ============================================================================
-- RLS policies
-- ============================================================================

ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_rows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'upload_sessions' AND policyname = 'Allow all for authenticated') THEN
    CREATE POLICY "Allow all for authenticated" ON upload_sessions FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'upload_sessions' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON upload_sessions FOR ALL TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'upload_rows' AND policyname = 'Allow all for authenticated') THEN
    CREATE POLICY "Allow all for authenticated" ON upload_rows FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'upload_rows' AND policyname = 'Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON upload_rows FOR ALL TO anon USING (true);
  END IF;
END $$;

-- ============================================================================
-- Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON upload_sessions;
CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_upload_rows_updated_at ON upload_rows;
CREATE TRIGGER update_upload_rows_updated_at
  BEFORE UPDATE ON upload_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
