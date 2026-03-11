-- ============================================================================
-- SECURITY FIX: Remove overly permissive RLS policies
-- ============================================================================
-- The app uses custom auth (not Supabase Auth), so all browser requests arrive
-- as the 'anon' role. All DB access now goes through the service role client
-- on the server side, which bypasses RLS entirely. These policies are removed
-- to prevent unauthorized direct access via the anon key.
-- ============================================================================

-- Drop all "Allow all for anon" policies (development-only, never should have been in production)
-- Note: tables dropped in 20260204_remove_unused_tables.sql are excluded (ai_models,
-- hubspot_fields, header_mappings, enrichment_configs, validation_scripts,
-- import_audit_log, crm_properties, crm_records) since DROP POLICY fails if the
-- relation itself does not exist.
DROP POLICY IF EXISTS "Allow all for anon" ON accounts;
DROP POLICY IF EXISTS "Allow all for anon" ON users;
DROP POLICY IF EXISTS "Allow all for anon" ON user_sessions;
DROP POLICY IF EXISTS "Allow all for anon" ON app_settings;
DROP POLICY IF EXISTS "Allow all for anon" ON account_integrations;
DROP POLICY IF EXISTS "Allow all for anon" ON upload_sessions;
DROP POLICY IF EXISTS "Allow all for anon" ON upload_rows;
DROP POLICY IF EXISTS "Allow all for anon" ON password_reset_tokens;

-- Drop all "Allow all for authenticated" policies (too permissive, no account isolation)
DROP POLICY IF EXISTS "Allow all for authenticated" ON accounts;
DROP POLICY IF EXISTS "Allow all for authenticated" ON users;
DROP POLICY IF EXISTS "Allow all for authenticated" ON user_sessions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON app_settings;
DROP POLICY IF EXISTS "Allow all for authenticated" ON account_integrations;
DROP POLICY IF EXISTS "Allow all for authenticated" ON upload_sessions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON upload_rows;
DROP POLICY IF EXISTS "Allow all for authenticated" ON password_reset_tokens;

-- Revoke anon access to sensitive RPC functions
-- Without this, an attacker could brute-force password verification via the PostgREST RPC endpoint
REVOKE EXECUTE ON FUNCTION verify_password(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION hash_password(text) FROM anon;
