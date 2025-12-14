-- Create a default company if none exists
INSERT INTO "P360-Opoint_Companies" (
  name,
  industry,
  phone,
  email
) VALUES (
  'Default Company',
  'Technology',
  '0240000000',
  'info@company.com'
) ON CONFLICT DO NOTHING;

-- Fix vpernarh@gmail.com user
UPDATE "P360-Opoint_User"
SET 
  role = 'Admin', -- Change from SuperAdmin to Admin so navigation works
  company_id = (SELECT id FROM "P360-Opoint_Companies" LIMIT 1), -- Assign to first company
  requires_password_change = TRUE, -- Force password change on next login
  updated_at = NOW()
WHERE email = 'vpernarh@gmail.com';

-- Verify the update
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.company_id,
  c.name as company_name,
  u.requires_password_change,
  u.temporary_password,
  u.password_hash IS NOT NULL as has_password
FROM "P360-Opoint_User" u
LEFT JOIN "P360-Opoint_Companies" c ON u.company_id = c.id
WHERE u.email = 'vpernarh@gmail.com';
