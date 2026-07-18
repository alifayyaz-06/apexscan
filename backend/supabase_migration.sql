-- ═══════════════════════════════════════════════════════════
-- Multi-Tenant SaaS Migration Script
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  username text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('kitchen_staff', 'sales_staff')),
  display_name text NOT NULL DEFAULT 'Staff',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, username)
);

-- 3. Add restaurant_id column to menu table
ALTER TABLE menu ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 4. Add restaurant_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- 5. Disable RLS on new tables (matching your existing setup)
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;

-- 6. Done! After running this, go back to the agent and proceed.
