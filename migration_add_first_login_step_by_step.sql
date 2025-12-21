-- =====================================================
-- Migration: Add First-Time Login Support
-- =====================================================
-- Run EACH STATEMENT SEPARATELY in Supabase SQL Editor
-- =====================================================

-- STEP 1: Add auth_user_id column
ALTER TABLE "P360-Opoint_User" 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- STEP 2: Add temporary_password column
ALTER TABLE "P360-Opoint_User" 
ADD COLUMN IF NOT EXISTS temporary_password TEXT;

-- STEP 3: Add password_changed_at column
ALTER TABLE "P360-Opoint_User" 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- STEP 4: Update default for requires_password_change
ALTER TABLE "P360-Opoint_User" 
ALTER COLUMN requires_password_change SET DEFAULT TRUE;

-- STEP 5: Create index
CREATE INDEX IF NOT EXISTS idx_p360_users_auth_id ON "P360-Opoint_User"(auth_user_id);

-- STEP 6: Insert or update test user
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

-- STEP 7: Verify the user was created
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



select * from company_vpena_teck_users;