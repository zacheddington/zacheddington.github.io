-- Drop and recreate 'who' and 'date_when' columns in the correct order
-- This will put 'who' before 'date_when' in the table structure

-- Step 1: Drop both columns
ALTER TABLE tbl_user DROP COLUMN who;
ALTER TABLE tbl_user DROP COLUMN date_when;

-- Step 2: Add them back in the desired order
-- First add 'who' (this will be position 7)
ALTER TABLE tbl_user ADD COLUMN who VARCHAR(50);

-- Then add 'date_when' (this will be position 8)
ALTER TABLE tbl_user ADD COLUMN date_when TIMESTAMP;

-- Step 3: Verify the new structure
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'tbl_user'
ORDER BY ordinal_position;

-- Step 4: Optional - Set default value for date_when to current timestamp for new records
ALTER TABLE tbl_user ALTER COLUMN date_when SET DEFAULT CURRENT_TIMESTAMP;
