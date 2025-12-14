-- =====================================================
-- Reset User Password to Temporary Password
-- =====================================================
-- This will reset vpernarh@gmail.com to use temporary password
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Reset vpernarh@gmail.com to temporary password
UPDATE "P360-Opoint_User"
SET 
  temporary_password = 'TempPass123!',
  password_hash = NULL,
  requires_password_change = TRUE,
  updated_at = NOW()
WHERE email = 'vpernarh@gmail.com';

-- Verify the update
SELECT 
  id,
  name,
  email,
  role,
  temporary_password,
  password_hash,
  requires_password_change,
  is_active
FROM "P360-Opoint_User"
WHERE email = 'vpernarh@gmail.com';
