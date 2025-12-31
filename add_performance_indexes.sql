-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Add these indexes to improve query performance
-- especially important for 1GB RAM servers
-- =====================================================

-- Clock Logs Indexes
-- Primary query: Get all clock logs for a specific employee on specific dates
CREATE INDEX IF NOT EXISTS idx_clock_logs_tenant_employee_date 
ON opoint_clock_logs(tenant_id, employee_id, date DESC);

-- Query: Get all clock logs for a tenant on a specific date (reports)
CREATE INDEX IF NOT EXISTS idx_clock_logs_tenant_date 
ON opoint_clock_logs(tenant_id, date DESC);

-- Query: Get clock logs by employee (for individual reports)
CREATE INDEX IF NOT EXISTS idx_clock_logs_employee 
ON opoint_clock_logs(employee_id);

-- Time Adjustment Requests Indexes
-- Primary query: Get pending adjustments for a tenant
CREATE INDEX IF NOT EXISTS idx_time_adjustments_tenant_status 
ON opoint_time_adjustments(tenant_id, adjustment_status);

-- Query: Get adjustments for specific employee
CREATE INDEX IF NOT EXISTS idx_time_adjustments_employee_status 
ON opoint_time_adjustments(employee_id, adjustment_status);

-- Query: Get adjustments by date range
CREATE INDEX IF NOT EXISTS idx_time_adjustments_date 
ON opoint_time_adjustments(tenant_id, requested_clock_in DESC);

-- Leave Requests Indexes
-- Query: Get leave requests by status
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_status 
ON opoint_leave_requests(tenant_id, status);

-- Query: Get leave requests for employee
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee 
ON opoint_leave_requests(employee_id);

-- Expense Claims Indexes
-- Query: Get expense claims by status
CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant_status 
ON opoint_expense_claims(tenant_id, status);

-- Query: Get expense claims for employee
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee 
ON opoint_expense_claims(employee_id);

-- Users Indexes (if not already present)
-- Query: Login and user lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
ON opoint_users(email);

CREATE INDEX IF NOT EXISTS idx_users_tenant 
ON opoint_users(tenant_id);

-- Announcements Indexes
-- Query: Get announcements for tenant
CREATE INDEX IF NOT EXISTS idx_announcements_tenant_date 
ON opoint_announcements(tenant_id, created_at DESC);

-- =====================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- Run this after creating indexes
-- =====================================================
ANALYZE opoint_clock_logs;
ANALYZE opoint_time_adjustments;
ANALYZE opoint_leave_requests;
ANALYZE opoint_expense_claims;
ANALYZE opoint_users;
ANALYZE opoint_announcements;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify indexes were created
-- =====================================================

-- List all indexes on clock_logs table
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'opoint_clock_logs'
ORDER BY indexname;

-- List all indexes on time_adjustments table
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'opoint_time_adjustments'
ORDER BY indexname;






ALTER TABLE opoint_clock_logs 
ADD COLUMN IF NOT EXISTS requested_clock_in_2 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requested_clock_out_2 TIMESTAMP WITH TIME ZONE;