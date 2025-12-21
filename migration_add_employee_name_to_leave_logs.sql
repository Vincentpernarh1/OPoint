-- Migration to add employee_name column to opoint_leave_logs table
-- This allows storing the employee name directly in the leave request for easier display

ALTER TABLE opoint_leave_logs
ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);

-- Add an index for better query performance when filtering by employee name
CREATE INDEX IF NOT EXISTS idx_opoint_leave_logs_employee_name ON opoint_leave_logs(employee_name);