-- Add a human-readable account number to accounts.
-- Uses a sequence so every new account gets the next integer automatically.

CREATE SEQUENCE IF NOT EXISTS account_number_seq START WITH 1000;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_number INTEGER UNIQUE DEFAULT nextval('account_number_seq');

-- Backfill existing accounts that have NULL account_number
-- (ordered by created_at so older accounts get lower numbers)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM accounts WHERE account_number IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE accounts SET account_number = nextval('account_number_seq') WHERE id = r.id;
  END LOOP;
END $$;

-- Make the column NOT NULL now that all rows are backfilled
ALTER TABLE accounts ALTER COLUMN account_number SET NOT NULL;
