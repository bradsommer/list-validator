-- Add object_types column to import_questions table
-- Stores which HubSpot object types (contacts, companies, deals) a question applies to
ALTER TABLE import_questions ADD COLUMN IF NOT EXISTS object_types JSONB DEFAULT '[]'::jsonb;
