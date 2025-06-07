-- Schema Update: Add 'who' field to tbl_user table
-- This field will track who created each user account

-- Add the 'who' column to tbl_user table
ALTER TABLE tbl_user ADD COLUMN who VARCHAR(50);

-- Verify the column was added successfully
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'tbl_user' AND column_name = 'who';

-- Optional: View the updated table structure
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'tbl_user'
ORDER BY ordinal_position;
