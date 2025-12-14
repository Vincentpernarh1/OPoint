-- =====================================================
-- Test: Create P360-Opoint_User table only
-- =====================================================

-- 1. Create the main users table
CREATE TABLE IF NOT EXISTS "P360-Opoint_User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'Employee',
  basic_salary DECIMAL(10, 2) DEFAULT 0,
  mobile_money_number TEXT,
  date_of_birth DATE,
  hire_date DATE DEFAULT CURRENT_DATE,
  department TEXT,
  position TEXT,
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  requires_password_change BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_p360_users_email ON "P360-Opoint_User"(email);
CREATE INDEX IF NOT EXISTS idx_p360_users_email_active ON "P360-Opoint_User"(email, is_active);

-- 3. Insert test user
INSERT INTO "P360-Opoint_User" (
  name,
  email,
  password_hash,
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
  'Vincent Pernarh',
  'vpernarh@gmail.com',
  '$2b$10$placeholder',
  'SuperAdmin',
  0,
  '0240000000',
  CURRENT_DATE,
  'Administration',
  'System Administrator',
  'active',
  TRUE,
  FALSE
) ON CONFLICT (email) DO NOTHING;

-- 4. Verify the user was created
SELECT id, name, email, role, is_active 
FROM "P360-Opoint_User" 
WHERE email = 'vpernarh@gmail.com';
