-- Insert companies from constants.ts into the database
-- Note: Replace the IDs with actual UUIDs if needed, but keeping as is for now

INSERT INTO companies (id, name, license_count, modules) VALUES
('c1', 'Vertex Innovations Ltd.', 50, '{"payroll": true, "leave": true, "expenses": true, "reports": true, "announcements": true}'),
('c2', 'Summit Solutions Inc.', 10, '{"payroll": true, "leave": true, "expenses": false, "reports": true, "announcements": false}'),
('1c8296f4-edad-4934-9638-d6ed933eeead', 'Vpena Teck', 50, '{"payroll": true, "leave": true, "expenses": true, "reports": true, "announcements": true}'),
('19333055-ca7a-4cc0-a4e6-1b5e444cf96e', 'Vpena Teck', 50, '{"payroll": true, "leave": true, "expenses": true, "reports": true, "announcements": true}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    license_count = EXCLUDED.license_count,
    modules = EXCLUDED.modules;