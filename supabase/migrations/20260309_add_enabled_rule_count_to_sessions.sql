-- Migration: Track the number of enabled rules per import session
-- This allows the dashboard time-saved calculation to use the actual
-- rule count from each import rather than the current account-level count.

ALTER TABLE upload_sessions
  ADD COLUMN IF NOT EXISTS enabled_rule_count INTEGER;
