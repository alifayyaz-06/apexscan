-- Migration v11: Waiter Calls Notification System

-- 1. Modify create_tenant_schema RPC to include waiter_calls and waiter_sessions table
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_slug text)
RETURNS void AS $$
DECLARE
  schema_name text;
BEGIN
  -- Normalize schema name
  schema_name := 'tenant_' || replace(lower(tenant_slug), '-', '_');

  -- 1. Create the private schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

  -- 2. Create restaurant_tables table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.restaurant_tables (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      qr_token text UNIQUE NOT NULL,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    )
  ', schema_name);

  -- 3. Create staff table
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

  -- 4. Create menu table
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

  -- 5. Create orders table
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

  -- 6. Create waiter_sessions table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.waiter_sessions (
      id text PRIMARY KEY,
      waiter_id text NOT NULL,
      waiter_name text NOT NULL,
      table_id text NOT NULL,
      table_name text NOT NULL,
      restaurant_slug text NOT NULL,
      started_at timestamptz DEFAULT now(),
      status text DEFAULT ''active''
    )
  ', schema_name);

  -- 7. Create waiter_calls table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.waiter_calls (
      id text PRIMARY KEY,
      table_id text NOT NULL,
      waiter_id text NOT NULL,
      restaurant_slug text NOT NULL,
      status text DEFAULT ''waiting'',
      created_at timestamptz DEFAULT now()
    )
  ', schema_name);

  -- 8. Disable RLS
  EXECUTE format('ALTER TABLE %I.restaurant_tables DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.staff DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.menu DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.orders DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.waiter_sessions DISABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.waiter_calls DISABLE ROW LEVEL SECURITY', schema_name);

  -- 9. Seed Table 1 to Table 5
  FOR i IN 1..5 LOOP
    EXECUTE format('
      INSERT INTO %I.restaurant_tables (name, qr_token) 
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    ', schema_name) USING format('Table %s', i), format('fallback-token-%s', i);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Dynamically upgrade existing tenant schemas
DO $$
DECLARE
  r record;
  schema_name text;
BEGIN
  FOR r IN SELECT DISTINCT slug FROM public.restaurants WHERE deleted_at IS NULL LOOP
    schema_name := 'tenant_' || replace(lower(r.slug), '-', '_');
    
    -- Try to create waiter_sessions table if missing
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.waiter_sessions (
          id text PRIMARY KEY,
          waiter_id text NOT NULL,
          waiter_name text NOT NULL,
          table_id text NOT NULL,
          table_name text NOT NULL,
          restaurant_slug text NOT NULL,
          started_at timestamptz DEFAULT now(),
          status text DEFAULT ''active''
        )
      ', schema_name);
      EXECUTE format('ALTER TABLE %I.waiter_sessions DISABLE ROW LEVEL SECURITY', schema_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not upgrade waiter_sessions for %s: %s', schema_name, SQLERRM;
    END;

    -- Try to create waiter_calls table if missing
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.waiter_calls (
          id text PRIMARY KEY,
          table_id text NOT NULL,
          waiter_id text NOT NULL,
          restaurant_slug text NOT NULL,
          status text DEFAULT ''waiting'',
          created_at timestamptz DEFAULT now()
        )
      ', schema_name);
      EXECUTE format('ALTER TABLE %I.waiter_calls DISABLE ROW LEVEL SECURITY', schema_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not upgrade waiter_calls for %s: %s', schema_name, SQLERRM;
    END;
  END LOOP;
END;
$$;
