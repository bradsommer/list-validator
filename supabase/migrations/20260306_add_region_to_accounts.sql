-- Add region column to accounts for data residency
-- Maps to server locations: us (USA), eu (EU), ch (Switzerland)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS region VARCHAR(10) NOT NULL DEFAULT 'us'
  CHECK (region IN ('us', 'eu', 'ch'));
