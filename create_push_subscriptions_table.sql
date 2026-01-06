-- SQL script to create push_subscriptions table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_id ON push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Add Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage all subscriptions (for server-side operations)
CREATE POLICY "Allow service role full access"
    ON push_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view their own subscriptions (for client-side)
CREATE POLICY "Users can view own subscriptions"
    ON push_subscriptions
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for users';
