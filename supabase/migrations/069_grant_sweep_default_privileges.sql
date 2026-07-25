-- 069_grant_sweep_default_privileges.sql--
-- Root cause (audited 2026-07-25): postgres-owned default ACL on schema
-- public grants D,x,t,m (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) to
-- anon and authenticated on every new table. All 26 unswept tables
-- inherited this. profiles was cleaned in 067/068.
--
-- Part 1: strip the never-legitimate privileges from existing tables.
-- Part 2: correct the default ACL so future tables do not re-inherit.
--
-- NOTE: MAINTAIN (m) is granted by the default ACL but is invisible in
-- information_schema.table_privileges; it is revoked here alongside the
-- audited trio.


-- Part 1: existing tables
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;


-- Part 2: future tables (postgres-owned defaults only; the
-- supabase_admin-owned default ACL is not alterable by postgres and
-- governs platform-created objects, not migration-created tables)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON TABLES
  FROM anon, authenticated;
