-- Add config JSONB column to users table for storing custom role permissions
ALTER TABLE users ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
