-- Split display_name into first_name and last_name
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Migrate existing display_name data: put full value into first_name as fallback
UPDATE users SET first_name = display_name WHERE display_name IS NOT NULL;

-- Drop the old column
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
