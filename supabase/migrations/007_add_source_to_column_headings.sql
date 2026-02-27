-- Migration: Add source tracking to column_headings
-- Tracks whether a heading was manually created or synced from HubSpot

ALTER TABLE column_headings
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS hubspot_object_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hubspot_field_name VARCHAR(255);

-- Prevent duplicate HubSpot properties per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_column_headings_hubspot_unique
  ON column_headings(account_id, hubspot_object_type, hubspot_field_name)
  WHERE source = 'hubspot';

COMMENT ON COLUMN column_headings.source IS 'Origin of the heading: manual or hubspot';
COMMENT ON COLUMN column_headings.hubspot_object_type IS 'HubSpot object type (contacts, companies, deals) if source=hubspot';
COMMENT ON COLUMN column_headings.hubspot_field_name IS 'HubSpot internal field name if source=hubspot';
