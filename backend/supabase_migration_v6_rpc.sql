-- SQL Migration v6: Database Router RPC for Tenant Schema Isolation (Fixed Variable Collision)
-- Run this in your Supabase SQL Editor to enable query routing.

CREATE OR REPLACE FUNCTION query_tenant(
  tenant_slug text,
  table_name text,
  operation text,
  query_id text DEFAULT NULL,
  payload jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  target_schema text;
  result jsonb;
  stmt text;
BEGIN
  -- 1. Normalize and resolve schema name
  target_schema := 'tenant_' || replace(lower(tenant_slug), '-', '_');

  -- Verify schema exists in the database to prevent run-time errors or SQL injections
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = target_schema) THEN
    RAISE EXCEPTION 'Schema % does not exist', target_schema;
  END IF;

  -- 2. Handle Operations
  IF operation = 'SELECT_ALL' THEN
    IF table_name = 'menu' THEN
      stmt := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM %I.menu WHERE deleted_at IS NULL ORDER BY sort_order ASC) t', target_schema);
    ELSIF table_name = 'orders' THEN
      stmt := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM %I.orders ORDER BY timestamp DESC) t', target_schema);
    ELSIF table_name = 'staff' THEN
      stmt := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM %I.staff WHERE deleted_at IS NULL ORDER BY created_at DESC) t', target_schema);
    ELSIF table_name = 'restaurant_tables' THEN
      stmt := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM %I.restaurant_tables ORDER BY name ASC) t', target_schema);
    ELSE
      RAISE EXCEPTION 'Invalid table: %', table_name;
    END IF;
    EXECUTE stmt INTO result;

  ELSIF operation = 'SELECT_ACTIVE' THEN
    IF table_name = 'orders' THEN
      stmt := format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM %I.orders WHERE status NOT IN (''completed'', ''cancelled'') ORDER BY timestamp DESC) t', target_schema);
    ELSE
      RAISE EXCEPTION 'Active status is only applicable for orders';
    END IF;
    EXECUTE stmt INTO result;

  ELSIF operation = 'SELECT_BY_ID' THEN
    IF table_name = 'menu' THEN
      stmt := format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.menu WHERE id = %L AND deleted_at IS NULL) t', target_schema, query_id);
    ELSIF table_name = 'orders' THEN
      stmt := format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.orders WHERE id = %L::uuid) t', target_schema, query_id);
    ELSIF table_name = 'staff' THEN
      -- Handle UUID lookup or employee code lookup
      IF query_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        stmt := format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.staff WHERE id = %L::uuid AND deleted_at IS NULL) t', target_schema, query_id);
      ELSE
        stmt := format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.staff WHERE employee_code = %L AND deleted_at IS NULL) t', target_schema, query_id);
      END IF;
    ELSIF table_name = 'restaurant_tables' THEN
      IF query_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        stmt := format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.restaurant_tables WHERE id = %L::uuid) t', target_schema, query_id);
      ELSE
        stmt := format('SELECT to_jsonb(t) FROM (SELECT * FROM %I.restaurant_tables WHERE qr_token = %L) t', target_schema, query_id);
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid table: %', table_name;
    END IF;
    EXECUTE stmt INTO result;

  ELSIF operation = 'INSERT' THEN
    IF table_name = 'menu' THEN
      stmt := format('INSERT INTO %I.menu (id, name, category, price, description, image, is_available, sort_order) ' ||
                     'VALUES (%L, %L, %L, (%L)::numeric, %L, %L, coalesce((%L)::boolean, true), coalesce((%L)::integer, 0)) RETURNING to_jsonb(%I.menu.*)',
                     target_schema,
                     payload->>'id', payload->>'name', payload->>'category', payload->>'price',
                     payload->>'description', payload->>'image', payload->>'is_available', payload->>'sort_order', target_schema);
    ELSIF table_name = 'orders' THEN
      stmt := format('INSERT INTO %I.orders (table_name, items, status, billing) ' ||
                     'VALUES (%L, %L::jsonb, %L, %L::jsonb) RETURNING to_jsonb(%I.orders.*)',
                     target_schema,
                     payload->>'table_name', payload->>'items', payload->>'status', payload->>'billing', target_schema);
    ELSIF table_name = 'staff' THEN
      stmt := format('INSERT INTO %I.staff (employee_code, password_hash, role, display_name, is_active) ' ||
                     'VALUES (%L, %L, %L, %L, coalesce((%L)::boolean, true)) RETURNING to_jsonb(%I.staff.*)',
                     target_schema,
                     payload->>'employee_code', payload->>'password_hash', payload->>'role', payload->>'display_name',
                     payload->>'is_active', target_schema);
    ELSIF table_name = 'restaurant_tables' THEN
      stmt := format('INSERT INTO %I.restaurant_tables (name, qr_token) ' ||
                     'VALUES (%L, %L) RETURNING to_jsonb(%I.restaurant_tables.*)',
                     target_schema,
                     payload->>'name', payload->>'qr_token', target_schema);
    ELSE
      RAISE EXCEPTION 'Invalid table: %', table_name;
    END IF;
    EXECUTE stmt INTO result;

  ELSIF operation = 'UPDATE' THEN
    IF table_name = 'menu' THEN
      stmt := format('UPDATE %I.menu SET name = coalesce(%L, name), category = coalesce(%L, category), ' ||
                     'price = coalesce((%L)::numeric, price), description = coalesce(%L, description), ' ||
                     'image = coalesce(%L, image), is_available = coalesce((%L)::boolean, is_available), ' ||
                     'sort_order = coalesce((%L)::integer, sort_order) WHERE id = %L RETURNING to_jsonb(%I.menu.*)',
                     target_schema,
                     payload->>'name', payload->>'category', payload->>'price', payload->>'description',
                     payload->>'image', payload->>'is_available', payload->>'sort_order', query_id, target_schema);
    ELSIF table_name = 'orders' THEN
      stmt := format('UPDATE %I.orders SET status = coalesce(%L, status), billing = coalesce(%L::jsonb, billing), items = coalesce(%L::jsonb, items) ' ||
                     'WHERE id = %L::uuid RETURNING to_jsonb(%I.orders.*)',
                     target_schema, payload->>'status', payload->>'billing', payload->>'items', query_id, target_schema);
    ELSIF table_name = 'staff' THEN
      stmt := format('UPDATE %I.staff SET display_name = coalesce(%L, display_name), ' ||
                     'role = coalesce(%L, role), is_active = coalesce((%L)::boolean, is_active), ' ||
                     'password_hash = coalesce(%L, password_hash), last_login = coalesce((%L)::timestamptz, last_login) ' ||
                     'WHERE id = %L::uuid RETURNING to_jsonb(%I.staff.*)',
                     target_schema,
                     payload->>'display_name', payload->>'role', payload->>'is_active', payload->>'password_hash',
                     payload->>'last_login', query_id, target_schema);
    ELSIF table_name = 'restaurant_tables' THEN
      stmt := format('UPDATE %I.restaurant_tables SET name = coalesce(%L, name), is_active = coalesce((%L)::boolean, is_active) ' ||
                     'WHERE id = %L::uuid RETURNING to_jsonb(%I.restaurant_tables.*)',
                     target_schema, payload->>'name', payload->>'is_active', query_id, target_schema);
    ELSE
      RAISE EXCEPTION 'Invalid table: %', table_name;
    END IF;
    EXECUTE stmt INTO result;

  ELSIF operation = 'DELETE' THEN
    IF table_name = 'menu' THEN
      stmt := format('UPDATE %I.menu SET deleted_at = now() WHERE id = %L', target_schema, query_id);
    ELSIF table_name = 'staff' THEN
      stmt := format('UPDATE %I.staff SET deleted_at = now() WHERE id = %L::uuid', target_schema, query_id);
    ELSIF table_name = 'restaurant_tables' THEN
      stmt := format('DELETE FROM %I.restaurant_tables WHERE id = %L::uuid', target_schema, query_id);
    ELSIF table_name = 'orders' THEN
      stmt := format('DELETE FROM %I.orders WHERE id = %L::uuid', target_schema, query_id);
    ELSE
      RAISE EXCEPTION 'Invalid table: %', table_name;
    END IF;
    EXECUTE stmt;
    result := '{"success": true}'::jsonb;

  ELSE
    RAISE EXCEPTION 'Invalid operation: %', operation;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
