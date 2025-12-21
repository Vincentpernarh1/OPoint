-- Fix existing leave request status values to use proper capitalization
UPDATE opoint_leave_logs
SET status = 'Pending'
WHERE status = 'pending';

UPDATE opoint_leave_logs
SET status = 'Approved'
WHERE status = 'approved';

UPDATE opoint_leave_logs
SET status = 'Rejected'
WHERE status = 'rejected';

-- Fix existing time adjustment status values
UPDATE opoint_clock_logs
SET adjustment_status = 'Pending'
WHERE adjustment_status = 'pending';

UPDATE opoint_clock_logs
SET adjustment_status = 'Approved'
WHERE adjustment_status = 'approved';

UPDATE opoint_clock_logs
SET adjustment_status = 'Rejected'
WHERE adjustment_status = 'rejected';