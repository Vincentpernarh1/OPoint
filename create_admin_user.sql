-- Insert a new Admin user based on your Super Admin details
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
  'admin-test@vpena.com',
  '$2b$10$placeholder', -- Set a real bcrypt hash for production
  'Admin',
  0,
  '0240000000',
  CURRENT_DATE,
  'Administration',
  'System Administrator',
  'active',
  TRUE,
  FALSE
) ON CONFLICT (email) DO NOTHING;

-- You can now log in as 'admin-test@vpena.com' with the password you set (replace the hash above with a real one).
