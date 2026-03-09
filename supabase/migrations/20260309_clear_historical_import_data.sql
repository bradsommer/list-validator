-- Migration: Clear all historical import data across all accounts
-- The time-saved formula was not recording per-import rule counts,
-- so historical data would produce inaccurate calculations.

DELETE FROM upload_rows;
DELETE FROM upload_sessions;
