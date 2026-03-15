-- Add marketing email opt-in column to users table
-- Stores whether user consented to receive marketing emails at signup.
-- Defaults to FALSE so existing users are not opted in.
-- This data can later be synced to HubSpot or another email platform.

ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMP WITH TIME ZONE;
