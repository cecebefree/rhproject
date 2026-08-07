-- 095_leads_read_policy.sql
-- ITEM-23-DEP-B / Row 44 (Front Desk intake — read surface).
--
-- Installs the tenant-scoped SELECT read policy for leads (R2: read path
-- scoped to requester's tenant via JWT -> tenant_id). Uses the canonical
-- helper public.jwt_tenant_id() (migration 086) that reads
-- auth.jwt() -> app_metadata ->> 'tenant_id', set by custom_access_token_hook
-- (022/087). Mirrors 088_rc_office_insert scope path.
--
-- NO BEHAVIOR CHANGE YET (keeps 078_leads_test.sql green unchanged):
--   - 078 test 1 asserts authenticated has ARRAY[] privileges on leads.
--   - 078 test 4 asserts authenticated SELECT on leads -> 42501 (grant-layer deny).
-- A policy does NOT grant a privilege. authenticated has no SELECT grant on
-- leads (078 grants INSERT to service_role only), so authenticated SELECT is
-- denied at the GRANT layer (42501) BEFORE the USING expression is evaluated.
-- The read surface therefore stays fail-closed until a SELECT grant ships with
-- the Front Desk read EF (deferred per 078 header: "Read and management
-- policies ship with the Front Desk read EF later").
--
-- hosts: local + hosted share this schema (no env side-effects).
-- predecessor: 094_fix_get_announcements_jwt_tenant_path.sql

BEGIN;

DROP POLICY IF EXISTS lead_read_own_tenant ON public.leads;

CREATE POLICY lead_read_own_tenant ON public.leads
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.jwt_tenant_id());

COMMENT ON POLICY lead_read_own_tenant ON public.leads IS
    'R2 Row 44: tenant-scoped lead read for Front Desk. Inert until SELECT grant ships with read EF (see 078 test 1 = ARRAY[], test 4 = 42501).';

COMMIT;
