-- ===================================================================
-- ONE-ROW-PER-DAY CLOCK LOG MIGRATION
-- ===================================================================
-- This migration adds columns and migrates data to the new architecture
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ===================================================================

-- Step 1: Add new columns
-- ===================================================================
ALTER TABLE opoint_clock_logs 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS punches JSONB DEFAULT '[]'::jsonb;

-- Step 2: Create index for performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_clock_logs_date 
ON opoint_clock_logs(employee_id, tenant_id, date);

-- Step 3: Migrate existing data to punches array
-- ===================================================================
UPDATE opoint_clock_logs
SET 
    date = CASE 
        WHEN clock_in IS NOT NULL THEN DATE(clock_in AT TIME ZONE 'UTC')
        WHEN clock_out IS NOT NULL THEN DATE(clock_out AT TIME ZONE 'UTC')
        ELSE CURRENT_DATE
    END,
    punches = CASE
        -- Both clock_in and clock_out exist
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'in', 
                    'time', clock_in, 
                    'location', COALESCE(location, 'Unknown'), 
                    'photo', photo_url
                ),
                jsonb_build_object(
                    'type', 'out', 
                    'time', clock_out, 
                    'location', COALESCE(location, 'Unknown'), 
                    'photo', photo_url
                )
            )
        -- Only clock_in exists
        WHEN clock_in IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'in', 
                    'time', clock_in, 
                    'location', COALESCE(location, 'Unknown'), 
                    'photo', photo_url
                )
            )
        -- Only clock_out exists (edge case)
        WHEN clock_out IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'out', 
                    'time', clock_out, 
                    'location', COALESCE(location, 'Unknown'), 
                    'photo', photo_url
                )
            )
        -- No punch data
        ELSE '[]'::jsonb
    END
WHERE (punches = '[]'::jsonb OR punches IS NULL) AND date IS NULL;

-- Step 4: Verify migration
-- ===================================================================
SELECT 
    'Migration Summary' as status,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN punches IS NOT NULL AND punches != '[]'::jsonb THEN 1 END) as migrated_rows,
    COUNT(CASE WHEN date IS NOT NULL THEN 1 END) as rows_with_date
FROM opoint_clock_logs;

-- Show sample migrated data
SELECT id, employee_id, date, punches, clock_in, clock_out
FROM opoint_clock_logs
WHERE punches IS NOT NULL AND punches != '[]'::jsonb
LIMIT 5;

-- ===================================================================
-- MIGRATION COMPLETE! 
-- ===================================================================
-- Next steps:
-- 1. Verify the migration results above
-- 2. Start your server: node server.js
-- 3. Run tests: node test_punches_architecture.js
-- ===================================================================
