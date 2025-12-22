-- =====================================================
-- Migration: Create Shared Tenant Tables
-- =====================================================

-- Create companies table (tenants)
CREATE TABLE IF NOT EXISTS opoint_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS opoint_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    avatar_url TEXT,
    company_id UUID,
    tenant_id UUID REFERENCES opoint_companies(id),
    basic_salary DECIMAL(10,2) DEFAULT 0,
    hire_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Auth fields
    password_hash TEXT,
    temporary_password TEXT,
    requires_password_change BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE
);

-- Create payroll history table
CREATE TABLE IF NOT EXISTS opoint_payroll_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    transaction_id VARCHAR(255),
    user_id UUID,
    amount DECIMAL(10,2),
    reason TEXT,
    status VARCHAR(50),
    external_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS opoint_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    basic_salary DECIMAL(10,2) DEFAULT 0,
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'Active',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clock logs table
CREATE TABLE IF NOT EXISTS opoint_clock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    employee_id UUID,
    employee_name VARCHAR(255),
    company_name VARCHAR(255),
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    location TEXT,
    photo_url TEXT,
    -- Time adjustment fields
    requested_clock_in TIMESTAMP WITH TIME ZONE,
    requested_clock_out TIMESTAMP WITH TIME ZONE,
    adjustment_reason TEXT,
    adjustment_status VARCHAR(50), -- 'Pending', 'Approved', 'Rejected'
    adjustment_requested_at TIMESTAMP WITH TIME ZONE,
    adjustment_reviewed_by UUID,
    adjustment_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave logs table
CREATE TABLE IF NOT EXISTS opoint_leave_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    employee_id UUID,
    leave_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS opoint_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance on tenant_id
CREATE INDEX IF NOT EXISTS idx_opoint_users_tenant_id ON opoint_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opoint_payroll_history_tenant_id ON opoint_payroll_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opoint_employees_tenant_id ON opoint_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opoint_clock_logs_tenant_id ON opoint_clock_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opoint_leave_logs_tenant_id ON opoint_leave_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opoint_announcements_tenant_id ON opoint_announcements(tenant_id);

-- Grant permissions
GRANT CREATE ON SCHEMA public TO service_role;





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




-- Create leave_balances table
CREATE TABLE IF NOT EXISTS opoint_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    employee_id UUID,
    leave_type VARCHAR(50) NOT NULL,
    total_days DECIMAL(5,2) DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    remaining_days DECIMAL(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, leave_type, year)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_opoint_leave_balances_tenant_employee ON opoint_leave_balances(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_opoint_leave_balances_year ON opoint_leave_balances(year);




select * from opoint_employees;