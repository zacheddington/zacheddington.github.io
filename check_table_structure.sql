-- Check current table structure
SELECT column_name, data_type, is_nullable, character_maximum_length, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'tbl_user'
ORDER BY ordinal_position;

-- Check if there's any data in the 'who' column we just added
SELECT who, COUNT(*) as count
FROM tbl_user
GROUP BY who;
