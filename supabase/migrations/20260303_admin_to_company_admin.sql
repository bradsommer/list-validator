-- Promote the seed admin user to company_admin role so they get
-- cross-account management features (Overview, Accounts, login-as).
UPDATE users
SET role = 'company_admin'
WHERE username = 'brad@bradsommer.com'
  AND role = 'admin';
