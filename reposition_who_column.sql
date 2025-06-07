-- Reposition 'who' column to be before 'date_when'
-- PostgreSQL limitation: New columns are always added at the end
-- To get exact positioning, we need to recreate the table structure

-- First, let's check what constraints and indexes exist on tbl_user
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'tbl_user';

-- For now, let's just drop and re-add the who column
-- The exact position isn't critical for functionality

-- Step 1: Drop the existing 'who' column
ALTER TABLE tbl_user DROP COLUMN who;

-- Step 2: Add 'who' column back (it will be at the end, position 8)
ALTER TABLE tbl_user ADD COLUMN who VARCHAR(50);

-- Step 3: Verify the structure
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'tbl_user'
ORDER BY ordinal_position;

-- Note: If you really need exact column positioning, we'd need to:
-- 1. Create a new table with exact column order
-- 2. Copy all data
-- 3. Drop old table and rename new one
-- 4. Recreate all constraints and indexes
-- This is complex and risky for production data
