-- Track completed imports for dashboard analytics
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  rules_applied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient monthly queries
CREATE INDEX IF NOT EXISTS idx_import_history_account_created
  ON import_history (account_id, created_at);

-- RLS policies
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON import_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON import_history FOR ALL USING (true) WITH CHECK (true);
