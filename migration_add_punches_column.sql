-- Migration: Add punches JSONB column and date column to opoint_clock_logs
-- This allows storing multiple clock-ins/outs per day in a single row

-- Add new columns
ALTER TABLE opoint_clock_logs 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS punches JSONB DEFAULT '[]'::jsonb;

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_clock_logs_date ON opoint_clock_logs(employee_id, tenant_id, date);

-- Migrate existing data to new structure
-- For each existing row, create a punch object and set the date
UPDATE opoint_clock_logs
SET 
    date = CASE 
        WHEN clock_in IS NOT NULL THEN DATE(clock_in AT TIME ZONE 'UTC')
        WHEN clock_out IS NOT NULL THEN DATE(clock_out AT TIME ZONE 'UTC')
        ELSE CURRENT_DATE
    END,
    punches = CASE
        WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'in',
                    'time', clock_in,
                    'location', location,
                    'photo', photo_url
                ),
                jsonb_build_object(
                    'type', 'out',
                    'time', clock_out,
                    'location', location,
                    'photo', photo_url
                )
            )
        WHEN clock_in IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'in',
                    'time', clock_in,
                    'location', location,
                    'photo', photo_url
                )
            )
        WHEN clock_out IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'out',
                    'time', clock_out,
                    'location', location,
                    'photo', photo_url
                )
            )
        ELSE '[]'::jsonb
    END
WHERE punches = '[]'::jsonb OR punches IS NULL;

-- NOTE: Keep clock_in and clock_out columns for now for backwards compatibility
-- They can be removed after full migration and testing

-- Consolidate multiple rows for the same day into single row
-- This is a complex operation, run with caution
DO $$
DECLARE
    log_record RECORD;
    consolidated_punches JSONB;
BEGIN
    -- Group by employee, tenant, and date
    FOR log_record IN 
        SELECT employee_id, tenant_id, date, array_agg(id ORDER BY clock_in NULLS LAST, clock_out NULLS LAST) as ids
        FROM opoint_clock_logs
        WHERE date IS NOT NULL
        GROUP BY employee_id, tenant_id, date
        HAVING COUNT(*) > 1
    LOOP
        -- Collect all punches for this day
        SELECT jsonb_agg(punch)
        INTO consolidated_punches
        FROM (
            SELECT jsonb_array_elements(punches) as punch
            FROM opoint_clock_logs
            WHERE id = ANY(log_record.ids)
            ORDER BY (punch->>'time')::timestamp
        ) punches_list;

        -- Update the first record with all punches
        UPDATE opoint_clock_logs
        SET punches = consolidated_punches
        WHERE id = log_record.ids[1];

        -- Delete duplicate records (keep first one)
        DELETE FROM opoint_clock_logs
        WHERE id = ANY(log_record.ids[2:array_length(log_record.ids, 1)]);
    END LOOP;
END $$;

-- Add comment to table
COMMENT ON COLUMN opoint_clock_logs.punches IS 'JSON array of punch objects: [{type: "in"|"out", time: timestamp, location: text, photo: text}]';
COMMENT ON COLUMN opoint_clock_logs.date IS 'Date of the work day (local timezone)';



select * from opoint_companies;