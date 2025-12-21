-- Migration: Add mobile_money_number column to opoint_users table
-- This column is needed for mobile money payroll functionality

ALTER TABLE opoint_users
ADD COLUMN IF NOT EXISTS mobile_money_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN opoint_users.mobile_money_number IS 'Ghana phone number for mobile money payments (format: 0XXXXXXXXX)';