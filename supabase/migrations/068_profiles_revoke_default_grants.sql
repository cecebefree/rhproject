-- 068: Revoke unused Supabase-default table grants on profiles.
-- Origin: platform default privileges (no GRANT ALL in migrations;
-- confirmed via grep 2026-07-25). TRUNCATE is not subject to RLS —
-- holding it, any anon/authenticated-invoked SQL surface could empty
-- the table across all tenants. TRIGGER/REFERENCES have no legitimate
-- use for end-user roles. service_role and postgres untouched.
-- Evidence: table_privileges audit 2026-07-25, ITEM-50 session.


REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.profiles FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.profiles FROM authenticated;
