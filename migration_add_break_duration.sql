-- Add break_duration_minutes column to opoint_companies table
-- This allows each company to set their standard break duration

ALTER TABLE opoint_companies 
ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 60;

-- Add comment to explain the column
COMMENT ON COLUMN opoint_companies.break_duration_minutes IS 'Standard break duration in minutes that will be automatically deducted from single-session work days (default: 60 minutes / 1 hour)';

-- Update existing companies to have the default value
UPDATE opoint_companies 
SET break_duration_minutes = 60 
WHERE break_duration_minutes IS NULL;
