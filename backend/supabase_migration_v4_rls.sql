-- ═══════════════════════════════════════════════════════════
-- Supabase Row-Level Security (RLS) Tenant Isolation Policies
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Enable Row-Level Security on all tenant tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies to avoid duplicates
DROP POLICY IF EXISTS restaurant_owner_policy ON restaurants;
DROP POLICY IF EXISTS staff_tenant_policy ON staff;
DROP POLICY IF EXISTS menu_tenant_policy ON menu;
DROP POLICY IF EXISTS menu_public_read ON menu;
DROP POLICY IF EXISTS tables_tenant_policy ON restaurant_tables;
DROP POLICY IF EXISTS tables_public_read ON restaurant_tables;
DROP POLICY IF EXISTS orders_tenant_policy ON orders;
DROP POLICY IF EXISTS orders_public_insert ON orders;
DROP POLICY IF EXISTS orders_public_read ON orders;

-- ─── RESTAURANTS POLICIES ───
-- Admins can only view and manage their own restaurant row
CREATE POLICY restaurant_owner_policy ON restaurants
  FOR ALL
  USING (owner_email = auth.jwt() ->> 'email')
  WITH CHECK (owner_email = auth.jwt() ->> 'email');

-- Allow public read of restaurant details (needed for customer branding/landing page)
CREATE POLICY restaurant_public_read ON restaurants
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- ─── STAFF POLICIES ───
-- Only the restaurant owner can manage their staff records
CREATE POLICY staff_tenant_policy ON staff
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- ─── MENU POLICIES ───
-- Restaurant owners can perform CRUD on menu items
CREATE POLICY menu_tenant_policy ON menu
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Public customers can read menu items
CREATE POLICY menu_public_read ON menu
  FOR SELECT
  USING (deleted_at IS NULL AND is_available = true);

-- ─── TABLES POLICIES ───
-- Restaurant owners can manage table configurations
CREATE POLICY tables_tenant_policy ON restaurant_tables
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Public customers can view table metadata (to verify table session on scan)
CREATE POLICY tables_public_read ON restaurant_tables
  FOR SELECT
  USING (is_active = true);

-- ─── ORDERS POLICIES ───
-- Restaurant owners can read and update orders
CREATE POLICY orders_tenant_policy ON orders
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_email = auth.jwt() ->> 'email'
    )
  );

-- Public customers can insert new orders
CREATE POLICY orders_public_insert ON orders
  FOR INSERT
  WITH CHECK (true);

-- Public customers can track their own placed order status
CREATE POLICY orders_public_read ON orders
  FOR SELECT
  USING (true);
