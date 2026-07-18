-- ═══════════════════════════════════════════════════════════
-- UNIFIED SAAS PRODUCTION UPGRADES & RLS MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Upgrade restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS plan text DEFAULT 'trial';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT now() + interval '30 days';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Set a unique constraint on restaurant slug
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_slug_idx ON restaurants (slug) WHERE deleted_at IS NULL;

-- 2. Create restaurant_tables table
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  qr_token text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Upgrade staff table
-- Rename username to employee_code if it exists, otherwise add it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'staff'::regclass AND attname = 'username') THEN
    ALTER TABLE staff RENAME COLUMN username TO employee_code;
  ELSE
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS employee_code text;
  END IF;
END $$;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login timestamptz;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update constraints
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_restaurant_id_username_key;
ALTER TABLE staff ADD CONSTRAINT staff_restaurant_id_employee_code_key UNIQUE (restaurant_id, employee_code);

-- 4. Upgrade menu table
ALTER TABLE menu ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0.08;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 5. Upgrade orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number serial;

-- ═══════════════════════════════════════════════════════════
-- 6. Enable Row-Level Security (RLS) & Multi-Tenant Isolation
-- ═══════════════════════════════════════════════════════════
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to prevent conflicts
DROP POLICY IF EXISTS restaurant_owner_policy ON restaurants;
DROP POLICY IF EXISTS restaurant_public_read ON restaurants;
DROP POLICY IF EXISTS staff_tenant_policy ON staff;
DROP POLICY IF EXISTS menu_tenant_policy ON menu;
DROP POLICY IF EXISTS menu_public_read ON menu;
DROP POLICY IF EXISTS tables_tenant_policy ON restaurant_tables;
DROP POLICY IF EXISTS tables_public_read ON restaurant_tables;
DROP POLICY IF EXISTS orders_tenant_policy ON orders;
DROP POLICY IF EXISTS orders_public_insert ON orders;
DROP POLICY IF EXISTS orders_public_read ON orders;

-- Restaurants Policies: Admins manage, public reads
CREATE POLICY restaurant_owner_policy ON restaurants
  FOR ALL
  USING (owner_email = auth.jwt() ->> 'email')
  WITH CHECK (owner_email = auth.jwt() ->> 'email');

CREATE POLICY restaurant_public_read ON restaurants
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Staff Policies: Only restaurant owners manage
CREATE POLICY staff_tenant_policy ON staff
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Menu Policies: Restaurant owners CRUD, public reads
CREATE POLICY menu_tenant_policy ON menu
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY menu_public_read ON menu
  FOR SELECT
  USING (deleted_at IS NULL AND is_available = true);

-- Tables Policies: Restaurant owners manage, public reads
CREATE POLICY tables_tenant_policy ON restaurant_tables
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY tables_public_read ON restaurant_tables
  FOR SELECT
  USING (is_active = true);

-- Orders Policies: Owners manage, customers place & read
CREATE POLICY orders_tenant_policy ON orders
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY orders_public_insert ON orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY orders_public_read ON orders
  FOR SELECT
  USING (true);
