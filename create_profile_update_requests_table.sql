-- =====================================================
-- Profile Update Requests Table
-- =====================================================

-- Profile update requests table
CREATE TABLE IF NOT EXISTS opoint_profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    employee_name TEXT NOT NULL,
    field_name TEXT NOT NULL, -- 'mobile_money_number', 'email', etc.
    current_value TEXT,
    requested_value TEXT NOT NULL,
    requested_by UUID NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Cancelled'
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_tenant_id ON opoint_profile_update_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_user_id ON opoint_profile_update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_status ON opoint_profile_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_requested_at ON opoint_profile_update_requests(requested_at);

-- Add foreign key constraints (optional, depending on your setup)
-- ALTER TABLE opoint_profile_update_requests ADD CONSTRAINT fk_profile_requests_tenant FOREIGN KEY (tenant_id) REFERENCES opoint_companies(id);
-- ALTER TABLE opoint_profile_update_requests ADD CONSTRAINT fk_profile_requests_user FOREIGN KEY (user_id) REFERENCES opoint_users(id);