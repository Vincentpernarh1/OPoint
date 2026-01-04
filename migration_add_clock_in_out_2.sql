-- Add actual clock_in_2 and clock_out_2 fields to store approved multi-session data
-- These fields store the approved times after an adjustment is approved
-- This complements the requested_clock_in_2/requested_clock_out_2 fields

ALTER TABLE opoint_clock_logs 
ADD COLUMN IF NOT EXISTS clock_in_2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clock_out_2 TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN opoint_clock_logs.clock_in_2 IS 'Second clock-in time (return from break) for approved adjustments with multiple sessions';
COMMENT ON COLUMN opoint_clock_logs.clock_out_2 IS 'Second clock-out time (end of day) for approved adjustments with multiple sessions';
