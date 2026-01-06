-- Fix RLS policies for push_subscriptions table
-- Run this in Supabase SQL Editor to fix the production error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow service role full access" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;

-- Create correct policies for server-side cookie auth
CREATE POLICY "Allow service role full access"
    ON push_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view own subscriptions"
    ON push_subscriptions
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'push_subscriptions';

-- Test query (should return success)
SELECT COUNT(*) FROM push_subscriptions;



-- Drop the bad policy
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;

-- Add correct policy for service role
CREATE POLICY "Allow service role full access"
    ON push_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
