-- =====================================================
-- Time Adjustment Migration for Existing Clock Logs Table
-- =====================================================

-- Add time adjustment columns to existing opoint_clock_logs table
ALTER TABLE opoint_clock_logs
ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS requested_clock_in TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requested_clock_out TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT,
ADD COLUMN IF NOT EXISTS adjustment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS adjustment_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS adjustment_reviewed_by UUID,
ADD COLUMN IF NOT EXISTS adjustment_reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for time adjustments
CREATE INDEX IF NOT EXISTS idx_clock_logs_adjustment_status ON opoint_clock_logs(adjustment_status);
CREATE INDEX IF NOT EXISTS idx_clock_logs_adjustment_requested_at ON opoint_clock_logs(adjustment_requested_at);


select * from opoint_companies;