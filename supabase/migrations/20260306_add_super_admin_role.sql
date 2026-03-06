-- Introduce super_admin role.
-- Existing company_admin users are FreshSegments-internal accounts
-- and should be promoted to super_admin.
-- The company_admin role is repurposed as a cross-account admin
-- assignable by super_admins.

UPDATE users
SET role = 'super_admin'
WHERE role = 'company_admin';
