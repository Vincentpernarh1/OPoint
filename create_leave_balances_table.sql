-- Create leave_balances table
CREATE TABLE IF NOT EXISTS opoint_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    employee_id UUID,
    leave_type VARCHAR(50) NOT NULL,
    total_days DECIMAL(5,2) DEFAULT 0, -- Total allocated days
    used_days DECIMAL(5,2) DEFAULT 0,   -- Days already taken
    remaining_days DECIMAL(5,2) DEFAULT 0, -- Available days
    year INTEGER NOT NULL, -- Leave year (e.g., 2024)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, leave_type, year)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_opoint_leave_balances_tenant_employee ON opoint_leave_balances(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_opoint_leave_balances_year ON opoint_leave_balances(year);


select * from opoint_employees;