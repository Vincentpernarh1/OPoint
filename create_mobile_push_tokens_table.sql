-- Create table for mobile push tokens (FCM/APNs)
CREATE TABLE IF NOT EXISTS mobile_push_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, platform)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user 
ON mobile_push_tokens(user_id, tenant_id);

-- Enable RLS
ALTER TABLE mobile_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own mobile push tokens"
ON mobile_push_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mobile push tokens"
ON mobile_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mobile push tokens"
ON mobile_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mobile push tokens"
ON mobile_push_tokens FOR DELETE
USING (auth.uid() = user_id);
