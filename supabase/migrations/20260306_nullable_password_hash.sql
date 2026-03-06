-- Allow password_hash to be NULL for invite-based user creation.
-- Users set their password via the /setup-account invite link.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
