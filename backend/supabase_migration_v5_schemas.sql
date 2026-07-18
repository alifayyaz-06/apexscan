-- ═══════════════════════════════════════════════════════════
-- SCHEMA-PER-TENANT AUTOMATIC PROVISIONER STORED FUNCTION (NO DEFAULT MENU SEEDING)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug text)
RETURNS void AS $$
DECLARE
  schema_name text;
BEGIN
  -- Normalize schema name (replace dashes with underscores for Postgres compatibility)
  schema_name := 'tenant_' || replace(lower(tenant_slug), '-', '_');

  -- 1. Create the private schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

  -- 2. Create restaurant_tables table inside private schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.restaurant_tables (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      qr_token text UNIQUE NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    )
  ', schema_name);

  -- 3. Create staff table inside private schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.staff (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_code text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL,
      display_name text,
      is_active boolean DEFAULT true,
      last_login timestamptz,
      deleted_at timestamptz,
      created_at timestamptz DEFAULT now()
    )
  ', schema_name);

  -- 4. Create menu table inside private schema (EMPTY BY DEFAULT)
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.menu (
      id text PRIMARY KEY,
      name text NOT NULL,
      category text NOT NULL,
      price numeric NOT NULL,
      description text,
      image text,
      is_available boolean DEFAULT true,
      sort_order integer DEFAULT 0,
      tax_rate numeric DEFAULT 0.08,
      deleted_at timestamptz,
      created_at timestamptz DEFAULT now()
    )
  ', schema_name);

  -- 5. Create orders table inside private schema
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name text,
      order_number serial,
      items jsonb NOT NULL,
      status text NOT NULL,
      billing jsonb NOT NULL,
      timestamp timestamptz DEFAULT now()
    )
  ', schema_name);

  -- 6. Disable Row-Level Security on private schemas
  -- (Data isolation is physically enforced by schema boundaries, so RLS isn't needed)
  EXECUTE format('ALTER TABLE %I.restaurant_tables DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.staff DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.menu DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.orders DISABLE ROW LEVEL SECURITY', schema_name);

  -- 7. Seed Table 1 to Table 5 inside the newly created schema
  DECLARE
    table_count int;
  BEGIN
    EXECUTE format('SELECT count(*) FROM %I.restaurant_tables', schema_name) INTO table_count;
    IF table_count = 0 THEN
      EXECUTE format('
        INSERT INTO %I.restaurant_tables (name, qr_token) VALUES
        (''Table 1'', md5(random()::text)),
        (''Table 2'', md5(random()::text)),
        (''Table 3'', md5(random()::text)),
        (''Table 4'', md5(random()::text)),
        (''Table 5'', md5(random()::text))
      ', schema_name);
    END IF;
  END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
