-- Import Questions table: stores configurable questions shown during list import
-- Questions allow users to set column values for all rows based on their answer
--
-- Question types:
--   text: Free form text input
--   dropdown: Single selection dropdown
--   checkbox: Single checkbox (yes/no style)
--   radio: Radio button group (single selection)
--   multiselect: Multiple selection checkboxes
--
-- option_values: Maps option labels to output values (e.g., {"B2B": "Business-to-Business"})
--   If empty or key not present, uses the option label as the output value
-- default_value: If set, skip asking the user and use this value for all rows

CREATE TABLE IF NOT EXISTS import_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  column_header TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'dropdown', 'checkbox', 'radio', 'multiselect')),
  options JSONB DEFAULT '[]',
  option_values JSONB DEFAULT '{}',
  default_value TEXT DEFAULT NULL,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 100,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by account
CREATE INDEX IF NOT EXISTS idx_import_questions_account ON import_questions(account_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_import_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS import_questions_updated_at ON import_questions;
CREATE TRIGGER import_questions_updated_at
  BEFORE UPDATE ON import_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_import_questions_updated_at();

-- Enable RLS
ALTER TABLE import_questions ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for now (can be refined later)
DROP POLICY IF EXISTS "Allow all operations on import_questions" ON import_questions;
CREATE POLICY "Allow all operations on import_questions" ON import_questions
  FOR ALL USING (true) WITH CHECK (true);

-- Insert example questions for the 'default' account
INSERT INTO import_questions (account_id, question_text, column_header, question_type, options, is_required, display_order, enabled)
VALUES
  (
    'default',
    'Is this a B2B or B2C list?',
    'B2B or B2C',
    'radio',
    '["B2B", "B2C"]',
    true,
    10,
    true
  ),
  (
    'default',
    'Will you want to sync these contacts to Dynamics?',
    'Sync to Dynamics?',
    'checkbox',
    '["Yes", "No"]',
    false,
    20,
    true
  )
ON CONFLICT DO NOTHING;
