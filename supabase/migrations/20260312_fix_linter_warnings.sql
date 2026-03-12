-- ============================================================================
-- FIX: Resolve all Supabase linter warnings and suggestions
-- ============================================================================
-- 1. Fix function_search_path_mutable (5 warnings) — set search_path on all functions
-- 2. Fix rls_policy_always_true (8 warnings) — drop remaining overly permissive policies
-- 3. Fix rls_enabled_no_policy (9 suggestions) — add explicit service-role-only policies
-- ============================================================================

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH (5 warnings)
-- ============================================================================
-- Recreate all functions with SET search_path = '' to prevent search_path hijacking.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN extensions.crypt(password, extensions.gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN password_hash = extensions.crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION update_account_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION update_import_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================================================
-- 2. DROP REMAINING OVERLY PERMISSIVE RLS POLICIES (8 warnings)
-- ============================================================================
-- These tables still have USING (true) policies that bypass RLS.
-- Since all DB access goes through the service role, these are unnecessary.

-- column_headings: drop anon policy (keep authenticated account-scoped policy)
DROP POLICY IF EXISTS "Allow anon column_headings" ON column_headings;

-- column_mapping_history: drop anon policy (keep authenticated account-scoped policy)
DROP POLICY IF EXISTS "Allow anon column_mapping_history" ON column_mapping_history;

-- disabled_validation_rules: drop anon policy (keep authenticated account-scoped policy)
DROP POLICY IF EXISTS "Allow anon disabled_validation_rules" ON disabled_validation_rules;

-- hubspot_properties: drop both overly permissive policies
DROP POLICY IF EXISTS "Allow all for anon" ON hubspot_properties;
DROP POLICY IF EXISTS "Allow all for authenticated" ON hubspot_properties;

-- import_history: drop both overly permissive policies (table may exist only in live DB)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for anon" ON import_history;
  DROP POLICY IF EXISTS "Allow all for authenticated" ON import_history;
EXCEPTION WHEN undefined_table THEN
  -- import_history table may not exist in all environments
  NULL;
END $$;

-- import_questions: drop overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on import_questions" ON import_questions;

-- ============================================================================
-- 3. ADD SERVICE-ROLE-ONLY POLICIES FOR TABLES WITH RLS BUT NO POLICIES (9 suggestions)
-- ============================================================================
-- These tables have RLS enabled but no policies, which correctly denies all
-- non-service-role access. Adding explicit restrictive policies silences the
-- linter while preserving the same security posture.

-- account_integrations
CREATE POLICY "Deny all non-service-role access"
  ON account_integrations FOR ALL
  TO anon, authenticated
  USING (false);

-- account_rules
ALTER TABLE account_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all non-service-role access"
  ON account_rules FOR ALL
  TO anon, authenticated
  USING (false);

-- accounts
CREATE POLICY "Deny all non-service-role access"
  ON accounts FOR ALL
  TO anon, authenticated
  USING (false);

-- app_settings
CREATE POLICY "Deny all non-service-role access"
  ON app_settings FOR ALL
  TO anon, authenticated
  USING (false);

-- password_reset_tokens
CREATE POLICY "Deny all non-service-role access"
  ON password_reset_tokens FOR ALL
  TO anon, authenticated
  USING (false);

-- upload_rows
CREATE POLICY "Deny all non-service-role access"
  ON upload_rows FOR ALL
  TO anon, authenticated
  USING (false);

-- upload_sessions
CREATE POLICY "Deny all non-service-role access"
  ON upload_sessions FOR ALL
  TO anon, authenticated
  USING (false);

-- user_sessions
CREATE POLICY "Deny all non-service-role access"
  ON user_sessions FOR ALL
  TO anon, authenticated
  USING (false);

-- users
CREATE POLICY "Deny all non-service-role access"
  ON users FOR ALL
  TO anon, authenticated
  USING (false);

-- Also add policies to tables that just had their permissive policies dropped
-- (hubspot_properties and import_questions now have RLS but no policies)
CREATE POLICY "Deny all non-service-role access"
  ON hubspot_properties FOR ALL
  TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all non-service-role access"
  ON import_questions FOR ALL
  TO anon, authenticated
  USING (false);

-- import_history (if it exists)
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "Deny all non-service-role access" ON import_history FOR ALL TO anon, authenticated USING (false)';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
