-- ═══════════════════════════════════════════════════════════
-- SQL Migration v8: Restaurant Settings & Billing Configurations
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Add settings and branding columns to global restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 8.00;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS service_charge numeric DEFAULT 5.00;

-- 2. Verify columns are added
SELECT id, name, slug, logo_url, phone, address, email, tax_rate, service_charge 
FROM restaurants 
LIMIT 5;
