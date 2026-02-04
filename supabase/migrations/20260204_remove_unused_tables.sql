-- Migration: Remove unused tables after simplifying to upload/validate/export tool
-- Tables being dropped: crm_records, crm_properties, ai_models, enrichment_configs,
-- upload_sessions, upload_rows, header_mappings, hubspot_fields, import_audit_log,
-- validation_scripts, app_settings, account_integrations
--
-- Tables kept: accounts, users, user_sessions

-- ============================================================================
-- 1. Drop RLS policies first (must drop before tables)
-- ============================================================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_records;
DROP POLICY IF EXISTS "Allow all for anon" ON crm_records;
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_properties;
DROP POLICY IF EXISTS "Allow all for anon" ON crm_properties;
DROP POLICY IF EXISTS "Allow all for authenticated" ON ai_models;
DROP POLICY IF EXISTS "Allow all for anon" ON ai_models;
DROP POLICY IF EXISTS "Allow all for authenticated" ON enrichment_configs;
DROP POLICY IF EXISTS "Allow all for anon" ON enrichment_configs;
DROP POLICY IF EXISTS "Allow all for authenticated" ON upload_sessions;
DROP POLICY IF EXISTS "Allow all for anon" ON upload_sessions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON upload_rows;
DROP POLICY IF EXISTS "Allow all for anon" ON upload_rows;
DROP POLICY IF EXISTS "Allow all for authenticated" ON header_mappings;
DROP POLICY IF EXISTS "Allow all for anon" ON header_mappings;
DROP POLICY IF EXISTS "Allow all for authenticated" ON hubspot_fields;
DROP POLICY IF EXISTS "Allow all for anon" ON hubspot_fields;
DROP POLICY IF EXISTS "Allow all for authenticated" ON import_audit_log;
DROP POLICY IF EXISTS "Allow all for anon" ON import_audit_log;
DROP POLICY IF EXISTS "Allow all for authenticated" ON validation_scripts;
DROP POLICY IF EXISTS "Allow all for anon" ON validation_scripts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON app_settings;
DROP POLICY IF EXISTS "Allow all for anon" ON app_settings;
DROP POLICY IF EXISTS "Allow all for authenticated" ON account_integrations;
DROP POLICY IF EXISTS "Allow all for anon" ON account_integrations;
DROP POLICY IF EXISTS "Allow all for authenticated" ON hubspot_properties;
DROP POLICY IF EXISTS "Allow all for anon" ON hubspot_properties;

-- ============================================================================
-- 2. Drop triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_crm_records_updated_at ON crm_records;
DROP TRIGGER IF EXISTS update_crm_properties_updated_at ON crm_properties;
DROP TRIGGER IF EXISTS update_ai_models_updated_at ON ai_models;
DROP TRIGGER IF EXISTS update_enrichment_configs_updated_at ON enrichment_configs;
DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON upload_sessions;
DROP TRIGGER IF EXISTS update_upload_rows_updated_at ON upload_rows;
DROP TRIGGER IF EXISTS update_header_mappings_updated_at ON header_mappings;
DROP TRIGGER IF EXISTS update_hubspot_fields_updated_at ON hubspot_fields;
DROP TRIGGER IF EXISTS update_validation_scripts_updated_at ON validation_scripts;
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
DROP TRIGGER IF EXISTS update_account_integrations_updated_at ON account_integrations;
DROP TRIGGER IF EXISTS update_hubspot_properties_updated_at ON hubspot_properties;

-- ============================================================================
-- 3. Drop tables (order matters due to foreign key references)
-- ============================================================================

-- Tables with no dependents first
DROP TABLE IF EXISTS crm_records CASCADE;
DROP TABLE IF EXISTS crm_properties CASCADE;
DROP TABLE IF EXISTS upload_rows CASCADE;
DROP TABLE IF EXISTS upload_sessions CASCADE;
DROP TABLE IF EXISTS import_audit_log CASCADE;
DROP TABLE IF EXISTS header_mappings CASCADE;
DROP TABLE IF EXISTS enrichment_configs CASCADE;
DROP TABLE IF EXISTS validation_scripts CASCADE;
DROP TABLE IF EXISTS ai_models CASCADE;
DROP TABLE IF EXISTS hubspot_fields CASCADE;
DROP TABLE IF EXISTS hubspot_properties CASCADE;
DROP TABLE IF EXISTS account_integrations CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
