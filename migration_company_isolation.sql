-- =====================================================
-- COMPANY-SPECIFIC TABLE SETUP
-- =====================================================
-- Creates company-isolated tables using Row Level Security (RLS)
-- Each company will only see their own data
-- =====================================================

-- Enable RLS on existing tables
ALTER TABLE "P360-Opoint_User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "P360-Opoint_Employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "P360-Opoint_LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "P360-Opoint_Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "P360-Opoint_PayrollHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "P360-Opoint_Expenses" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR USERS
-- =====================================================

-- Users can only see users from their own company
DROP POLICY IF EXISTS "Users can view same company" ON "P360-Opoint_User";
CREATE POLICY "Users can view same company" ON "P360-Opoint_User"
    FOR SELECT
    USING (company_id = current_setting('app.current_company_id')::uuid);

-- Users can only update their own data
DROP POLICY IF EXISTS "Users can update own data" ON "P360-Opoint_User";
CREATE POLICY "Users can update own data" ON "P360-Opoint_User"
    FOR UPDATE
    USING (id = current_setting('app.current_user_id')::uuid);

-- Only admins can insert new users (will be enforced in app logic)
DROP POLICY IF EXISTS "Admins can insert users" ON "P360-Opoint_User";
CREATE POLICY "Admins can insert users" ON "P360-Opoint_User"
    FOR INSERT
    WITH CHECK (company_id = current_setting('app.current_company_id')::uuid);

-- =====================================================
-- RLS POLICIES FOR EMPLOYEES
-- =====================================================

DROP POLICY IF EXISTS "Company employees visible" ON "P360-Opoint_Employees";
CREATE POLICY "Company employees visible" ON "P360-Opoint_Employees"
    FOR ALL
    USING (company_id = current_setting('app.current_company_id')::uuid);

-- =====================================================
-- RLS POLICIES FOR LEAVE REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "Company leave requests visible" ON "P360-Opoint_LeaveRequest";
CREATE POLICY "Company leave requests visible" ON "P360-Opoint_LeaveRequest"
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM "P360-Opoint_Employees" 
            WHERE company_id = current_setting('app.current_company_id')::uuid
        )
    );

DROP POLICY IF EXISTS "Users can create own leave requests" ON "P360-Opoint_LeaveRequest";
CREATE POLICY "Users can create own leave requests" ON "P360-Opoint_LeaveRequest"
    FOR INSERT
    WITH CHECK (
        employee_id IN (
            SELECT id FROM "P360-Opoint_Employees" 
            WHERE company_id = current_setting('app.current_company_id')::uuid
        )
    );

-- =====================================================
-- RLS POLICIES FOR ATTENDANCE
-- =====================================================

DROP POLICY IF EXISTS "Company attendance visible" ON "P360-Opoint_Attendance";
CREATE POLICY "Company attendance visible" ON "P360-Opoint_Attendance"
    FOR ALL
    USING (
        employee_id IN (
            SELECT id FROM "P360-Opoint_Employees" 
            WHERE company_id = current_setting('app.current_company_id')::uuid
        )
    );

-- =====================================================
-- RLS POLICIES FOR PAYROLL
-- =====================================================

DROP POLICY IF EXISTS "Company payroll visible" ON "P360-Opoint_PayrollHistory";
CREATE POLICY "Company payroll visible" ON "P360-Opoint_PayrollHistory"
    FOR ALL
    USING (
        employee_id IN (
            SELECT id FROM "P360-Opoint_Employees" 
            WHERE company_id = current_setting('app.current_company_id')::uuid
        )
    );

-- =====================================================
-- RLS POLICIES FOR EXPENSES
-- =====================================================

DROP POLICY IF EXISTS "Company expenses visible" ON "P360-Opoint_Expenses";
CREATE POLICY "Company expenses visible" ON "P360-Opoint_Expenses"
    FOR ALL
    USING (
        employee_id IN (
            SELECT id FROM "P360-Opoint_Employees" 
            WHERE company_id = current_setting('app.current_company_id')::uuid
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to set company context (called from app)
CREATE OR REPLACE FUNCTION set_company_context(company_uuid uuid, user_uuid uuid)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_company_id', company_uuid::text, false);
    PERFORM set_config('app.current_user_id', user_uuid::text, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get current company ID
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS uuid AS $$
BEGIN
    RETURN current_setting('app.current_company_id', true)::uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on company_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON "P360-Opoint_Employees"(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON "P360-Opoint_User"(company_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON "P360-Opoint_Attendance"(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_employee_status ON "P360-Opoint_LeaveRequest"(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON "P360-Opoint_PayrollHistory"(employee_id, period_start, period_end);

-- =====================================================
-- NOTES FOR IMPLEMENTATION
-- =====================================================
-- 
-- In your Node.js application, before making queries:
-- 
-- 1. Set company context after user login:
--    await supabase.rpc('set_company_context', { 
--        company_uuid: user.company_id,
--        user_uuid: user.id
--    })
-- 
-- 2. All subsequent queries will automatically filter by company
--    
-- 3. Example:
--    const { data } = await supabase
--        .from('P360-Opoint_Employees')
--        .select('*')
--    // Will only return employees from user's company
--
-- =====================================================
