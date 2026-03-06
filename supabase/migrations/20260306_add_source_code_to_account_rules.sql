-- Add source_code column to account_rules so rule logic can be stored in the
-- database and evaluated dynamically at runtime (no server restart required).

ALTER TABLE account_rules ADD COLUMN IF NOT EXISTS source_code TEXT;
