-- Add additional clock in/out fields to support break tracking in adjustments
-- This allows adjustments to have: Clock In 1, Clock Out 1 (break), Clock In 2, Clock Out 2

ALTER TABLE opoint_clock_logs 
ADD COLUMN IF NOT EXISTS requested_clock_in_2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requested_clock_out_2 TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN opoint_clock_logs.requested_clock_in_2 IS 'Second clock-in time (return from break) for adjustment requests with multiple sessions';
COMMENT ON COLUMN opoint_clock_logs.requested_clock_out_2 IS 'Second clock-out time (end of day) for adjustment requests with multiple sessions';
