\dt public.*
SELECT table_schema, count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') GROUP BY table_schema;

SELECT phone, display_name, phone_verified, (password_hash IS NOT NULL) AS has_pw FROM users ORDER BY phone;
SELECT 'zones' AS t, count(*) FROM service_zones
UNION ALL SELECT 'pricing', count(*) FROM pricing_rules
UNION ALL SELECT 'ledger_accounts', count(*) FROM ledger_accounts
UNION ALL SELECT 'riders', count(*) FROM riders
UNION ALL SELECT 'merchants', count(*) FROM merchants
UNION ALL SELECT 'vehicles', count(*) FROM vehicles
UNION ALL SELECT 'roles', count(*) FROM roles
UNION ALL SELECT 'jobs', count(*) FROM jobs;
SELECT postgis_version();
