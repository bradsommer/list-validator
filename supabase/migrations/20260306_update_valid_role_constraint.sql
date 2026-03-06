-- Update the valid_role check constraint to include all supported roles.
-- Previously it may have only included 'admin' and 'user'.

ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_role;

ALTER TABLE users ADD CONSTRAINT valid_role CHECK (
  role IN ('super_admin', 'company_admin', 'admin', 'billing', 'editor', 'user', 'custom')
);
