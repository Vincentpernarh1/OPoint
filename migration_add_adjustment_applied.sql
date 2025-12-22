-- =====================================================
-- Migration to add adjustment_applied flag
-- =====================================================

ALTER TABLE opoint_clock_logs
ADD COLUMN IF NOT EXISTS adjustment_applied BOOLEAN DEFAULT FALSE;

-- Update existing approved adjustments to be marked as applied
UPDATE opoint_clock_logs
SET adjustment_applied = TRUE
WHERE adjustment_status = 'approved';