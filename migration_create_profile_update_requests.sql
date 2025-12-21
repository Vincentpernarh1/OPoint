-- Migration: Create profile_update_requests table
-- This table stores requests for profile updates that require approval

CREATE TABLE IF NOT EXISTS opoint_profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES opoint_companies(id),
    user_id UUID NOT NULL,
    employee_name TEXT NOT NULL,
    field_name TEXT NOT NULL, -- e.g., 'mobile_money_number'
    current_value TEXT,
    requested_value TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    requested_by UUID NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_tenant_user ON opoint_profile_update_requests(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_profile_update_requests_status ON opoint_profile_update_requests(status);

-- Add comment for documentation
COMMENT ON TABLE opoint_profile_update_requests IS 'Stores profile update requests that require approval before being applied';
COMMENT ON COLUMN opoint_profile_update_requests.field_name IS 'The field being requested for update (e.g., mobile_money_number)';
COMMENT ON COLUMN opoint_profile_update_requests.current_value IS 'The current value of the field';
COMMENT ON COLUMN opoint_profile_update_requests.requested_value IS 'The new value requested for the field';