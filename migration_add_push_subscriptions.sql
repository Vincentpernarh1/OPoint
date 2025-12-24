-- Migration: Add push subscriptions table for web push notifications
-- Date: 2025-12-24

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_id ON push_subscriptions(tenant_id);

-- Add RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid()::text = user_id::text);