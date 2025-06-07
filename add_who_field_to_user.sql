-- SQL script to add 'who' field to tbl_user table
-- This field will store the username of the person who created the user account

-- Add the 'who' column to tbl_user table
ALTER TABLE tbl_user 
ADD COLUMN who VARCHAR(50);

-- Add a comment to document the purpose of the field
COMMENT ON COLUMN tbl_user.who IS 'Username of the person who created this user account';

-- Optionally, update existing records to set 'who' to 'system' or 'admin' for historical records
-- UPDATE tbl_user SET who = 'admin' WHERE who IS NULL;

-- Display the updated table structure
\d tbl_user;
