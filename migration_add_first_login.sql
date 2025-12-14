-- =====================================================
-- Migration: Add First-Time Login Support
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add auth_user_id column if it doesn't exist
ALTER TABLE "P360-Opoint_User" 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Add temporary_password column if it doesn't exist
ALTER TABLE "P360-Opoint_User" 
ADD COLUMN IF NOT EXISTS temporary_password TEXT;

-- Add password_changed_at column if it doesn't exist
ALTER TABLE "P360-Opoint_User" 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Update requires_password_change default for new users (only if column exists)
ALTER TABLE "P360-Opoint_User" 
ALTER COLUMN requires_password_change SET DEFAULT TRUE;

-- Create index for auth_user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_p360_users_auth_id ON "P360-Opoint_User"(auth_user_id);

-- Insert or update test user
INSERT INTO "P360-Opoint_User" (
  name,
  email,
  temporary_password,
  role,
  basic_salary,
  mobile_money_number,
  hire_date,
  department,
  position,
  status,
  is_active,
  requires_password_change
) VALUES (
  'Bernard Pernarh',
  'Kofigogoli@gmail.com',
  'TempPass123!',
  'SuperAdmin',
  0,
  '0240000000',
  CURRENT_DATE,
  'Administration',
  'System Administrator',
  'active',
  TRUE,
  TRUE
) 
ON CONFLICT (email) 
DO UPDATE SET
  temporary_password = 'TempPass123!',
  requires_password_change = TRUE,
  password_hash = NULL,
  updated_at = NOW();

-- Verify the user was created
SELECT 
  id,
  name,
  email,
  role,
  temporary_password,
  requires_password_change,
  is_active
FROM "P360-Opoint_User"
WHERE email = 'Kofigogoli@gmail.com';
