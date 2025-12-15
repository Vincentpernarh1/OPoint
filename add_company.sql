INSERT INTO opoint_companies (id, name, table_name, admin_email, license_count, modules) VALUES ('4b7e93eb-91f7-49e4-9ab4-536a8487a3dc', 'Vpena Teck', 'company_vpena_teck_users', 'admin@vpena.com', 50, '{\
payroll\: true, \leave\: true, \expenses\: true, \reports\: true, \announcements\: true}'::jsonb) ON CONFLICT (id) DO NOTHING;
