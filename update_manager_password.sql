-- Ensure pgcrypto (for gen_random_uuid) or uuid-ossp extension is available
-- If gen_random_uuid is not available, try using uuid_generate_v4() (uuid-ossp)
DO $$
BEGIN
	BEGIN
		CREATE EXTENSION IF NOT EXISTS pgcrypto;
	EXCEPTION WHEN OTHERS THEN
		-- ignore (the extension may not be allowed/available)
		RAISE NOTICE 'pgcrypto extension not available';
	END;
END $$;

-- Create a company table if it doesn't exist (safe-guard for environments without one)
CREATE TABLE IF NOT EXISTS "P360-Opoint_Company" (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	licenseCount integer DEFAULT 0,
	modules jsonb DEFAULT '{}'::jsonb
);

DO $$
DECLARE
	_company_id uuid;
BEGIN
	-- Ensure at least one UUID generator is available
	BEGIN
		CREATE EXTENSION IF NOT EXISTS pgcrypto;
	EXCEPTION WHEN OTHERS THEN
		NULL;
	END;
	BEGIN
		CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
	EXCEPTION WHEN OTHERS THEN
		NULL;
	END;

	BEGIN
		_company_id := gen_random_uuid();
	EXCEPTION WHEN undefined_function THEN
		_company_id := uuid_generate_v4();
	END;

	IF NOT EXISTS (SELECT 1 FROM "P360-Opoint_Company" WHERE name = 'Vpena Teck') THEN
		INSERT INTO "P360-Opoint_Company" (id, name, licenseCount, modules)
		VALUES (_company_id, 'Vpena Teck', 50, '{"payroll": true, "leave": true, "expenses": true, "reports": true, "announcements": true}'::jsonb);
	END IF;
END $$;

-- Assign the manager to the company by setting company_id to a valid UUID
UPDATE "P360-Opoint_User"
SET "company_id" = (
	SELECT id FROM "P360-Opoint_Company" WHERE name = 'Vpena Teck' LIMIT 1
)
WHERE email = 'manager-test@vpena.com';

-- ============================================================
-- Fallback for environments WITHOUT a P360-Opoint_Company table
-- If you cannot or do not want to create a company table, set a fixed valid UUID
-- as the company_id on the user row and then add the same UUID to your
-- front-end `COMPANIES` list in `constants.ts` so the app recognizes it.
-- Replace the example UUID below with a chosen one (valid UUID format):

-- Set the manager's company_id to a fixed UUID (example)
UPDATE "P360-Opoint_User"
SET "company_id" = '11111111-1111-1111-1111-111111111111'::uuid
WHERE email = 'manager-test@vpena.com';

-- Verification queries (run in psql or DB tool):
-- SELECT id, name FROM "P360-Opoint_Company" WHERE name = 'Vpena Teck';
-- SELECT company_id FROM "P360-Opoint_User" WHERE email = 'manager-test@vpena.com';
-- ============================================================


select * from  company_vpena_teck_users;



select * from  opoint_announcements;