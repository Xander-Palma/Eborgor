-- Fix script to remove problematic triggers that reference non-existent tables
-- Run this script in your Supabase SQL editor to fix the database

-- Drop the problematic triggers first
DROP TRIGGER IF EXISTS trigger_update_ingredient_inventory ON order_product;
DROP TRIGGER IF EXISTS trigger_restore_ingredient_inventory ON orders;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS update_ingredient_inventory_on_order();
DROP FUNCTION IF EXISTS restore_ingredient_inventory_on_cancel();

-- Verify the correct triggers still exist
-- These should remain:
-- - trigger_update_inventory (updates inventory table correctly)
-- - trigger_restore_inventory_on_cancel (restores inventory on cancellation)
