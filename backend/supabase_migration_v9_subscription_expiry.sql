-- Migration v9: Subscription Expiry System
-- Adds activation tracking columns for automatic subscription expiry

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS activated_at timestamptz DEFAULT now();
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_days integer;

-- Backfill activated_at from created_at for existing restaurants
UPDATE restaurants SET activated_at = created_at WHERE activated_at IS NULL;
