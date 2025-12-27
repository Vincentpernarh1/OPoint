-- Migration: Add working hours per day to companies table
-- This allows each company to set their own standard working hours

ALTER TABLE opoint_companies
ADD COLUMN IF NOT EXISTS working_hours_per_day DECIMAL(4,2) DEFAULT 8.00;

-- Update existing companies to have 8 hours as default
UPDATE opoint_companies
SET working_hours_per_day = 8.00
WHERE working_hours_per_day IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN opoint_companies.working_hours_per_day IS 'Standard working hours per day for this company (used for payroll calculations)';