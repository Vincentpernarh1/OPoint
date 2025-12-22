-- =====================================================
-- Migration: Create Expense Claims Table
-- =====================================================

-- Create expense claims table
CREATE TABLE IF NOT EXISTS opoint_expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    employee_id UUID,
    employee_name VARCHAR(255),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_opoint_expense_claims_tenant_id ON opoint_expense_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opoint_expense_claims_employee_id ON opoint_expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_opoint_expense_claims_status ON opoint_expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_opoint_expense_claims_submitted_at ON opoint_expense_claims(submitted_at);