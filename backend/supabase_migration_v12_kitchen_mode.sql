-- SQL Migration v12: Optional Kitchen Display Screen (KDS) / Printer-Only Mode
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

-- 1. Add kitchen_mode column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kitchen_mode text DEFAULT 'display';

-- 2. Verify column is added
SELECT id, name, slug, kitchen_mode 
FROM restaurants 
LIMIT 5;
