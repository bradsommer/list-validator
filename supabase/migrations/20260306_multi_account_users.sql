-- Allow the same email (username) to exist in multiple accounts.
-- Previously: UNIQUE(username)
-- Now: UNIQUE(username, account_id)

-- Drop the old unique constraint on username alone
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

-- Add a composite unique constraint: same email can only appear once per account
ALTER TABLE users ADD CONSTRAINT users_username_account_id_key UNIQUE (username, account_id);
