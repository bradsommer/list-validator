-- Add column to track when a subscription was cancelled (for 45-day retention)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMP WITH TIME ZONE;
