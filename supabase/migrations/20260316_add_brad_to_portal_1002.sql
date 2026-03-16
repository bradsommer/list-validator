-- Add brad@bradsommer.com as a user to the account with account_number 1002.
--
-- The user was previously admin@example.com and the email was updated, which
-- left the account without a proper user row (orphaned account).  This
-- migration copies the password_hash from the existing brad@bradsommer.com row
-- so the user can log in immediately.

INSERT INTO users (username, password_hash, first_name, last_name, role, account_id, is_active)
SELECT
  'brad@bradsommer.com',
  existing.password_hash,
  existing.first_name,
  existing.last_name,
  'admin',
  a.id,
  TRUE
FROM accounts a
CROSS JOIN (
  SELECT password_hash, first_name, last_name
  FROM users
  WHERE username = 'brad@bradsommer.com'
    AND password_hash IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1
) existing
WHERE a.account_number = 1002
ON CONFLICT (username, account_id) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      is_active = TRUE;
