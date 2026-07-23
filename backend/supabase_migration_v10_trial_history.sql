-- Migration v10: Automated Free Trial and Trial History
-- Creates trial_history tracking table and registration transaction RPC function

-- 1. Create trial_history table
CREATE TABLE IF NOT EXISTS trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name text NOT NULL,
  trial_start timestamptz DEFAULT now(),
  trial_end timestamptz NOT NULL,
  trial_claimed_at timestamptz DEFAULT now(),
  trial_used boolean DEFAULT true,
  subscription_purchased boolean DEFAULT false,
  last_notification_sent integer DEFAULT -1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create UNIQUE index on case-insensitive email
CREATE UNIQUE INDEX IF NOT EXISTS trial_history_lower_email_idx ON trial_history (lower(trim(email)));

-- 3. Stored function for atomic registration transaction
CREATE OR REPLACE FUNCTION register_trial_restaurant(
  p_name text,
  p_slug text,
  p_owner_email text
)
RETURNS uuid AS $$
DECLARE
  v_normalized_email text;
  v_restaurant_id uuid;
  v_history_id uuid;
BEGIN
  -- Normalize email by trimming and converting to lowercase
  v_normalized_email := lower(trim(p_owner_email));

  -- 1. Check if email has already used free trial
  IF EXISTS (
    SELECT 1 FROM trial_history WHERE lower(trim(email)) = v_normalized_email
  ) THEN
    RAISE EXCEPTION 'This email has already used its free trial. Please purchase a subscription or contact support.';
  END IF;

  -- 2. Check if slug is already taken (excluding deleted restaurants)
  IF EXISTS (
    SELECT 1 FROM restaurants WHERE slug = p_slug AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This restaurant slug is already registered. Please choose another slug.';
  END IF;

  -- 3. Check if email is already registered in active restaurants
  IF EXISTS (
    SELECT 1 FROM restaurants WHERE lower(trim(owner_email)) = v_normalized_email AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This email is already registered with another active restaurant.';
  END IF;

  -- 4. Create the restaurant record first (so we can reference its ID)
  INSERT INTO restaurants (
    name, 
    slug, 
    owner_email, 
    is_active, 
    plan, 
    subscription_status, 
    activated_at, 
    subscription_days, 
    expires_at
  )
  VALUES (
    p_name, 
    p_slug, 
    v_normalized_email, 
    true, 
    'trial', 
    'active', 
    now(), 
    14, 
    now() + interval '14 days'
  )
  RETURNING id INTO v_restaurant_id;

  -- 5. Insert into trial_history
  INSERT INTO trial_history (
    email, 
    restaurant_id, 
    restaurant_name, 
    trial_start, 
    trial_end, 
    trial_claimed_at, 
    trial_used
  )
  VALUES (
    v_normalized_email, 
    v_restaurant_id, 
    p_name, 
    now(), 
    now() + interval '14 days', 
    now(), 
    true
  )
  RETURNING id INTO v_history_id;

  RETURN v_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
