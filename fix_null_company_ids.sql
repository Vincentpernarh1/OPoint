-- Fix users with tenant_id stored as the string 'null' instead of actual NULL
-- This fixes the UUID parsing error: invalid input syntax for type uuid: "null"

UPDATE opoint_users 
SET tenant_id = NULL 
WHERE tenant_id = 'null' OR tenant_id = '';

-- Verify the fix
SELECT id, name, email, role, tenant_id 
FROM opoint_users 
WHERE tenant_id IS NULL;
