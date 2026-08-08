-- 096_leads_select_grant.sql
-- ITEM-23-DEP-B / Row 48 (Front Desk leads READ path).
-- Grants SELECT on leads TO authenticated (activates the inert
-- 095 lead_read_own_tenant policy). R2: read path scoped to
-- requester's tenant via JWT -> tenant_id via jwt_tenant_id().
-- This migration does NOT gate on Front Desk read EF — it adds the
-- grant layer access so the 095 policy's USING expression can
-- evaluate and return rows.
--
-- Test (078 test 4): authenticated SELECT on leads must now succeed
-- (return 0 cross-tenant rows) rather than throw 42501.
-- The original 42501 expectation is preserved in a dated comment block
-- citing R2 (Row 44).
--
-- R2: tenant-scoped lead read for Front Desk. 095 policy is inert until
-- a SELECT grant ships with the read EF (078 test 4 = 42501 preserved).
-- This migration activates it via GRANT SELECT.
--
-- Note: service_role bypasses RLS via default ACL. The RLS policy
-- (095) only applies to authenticated roles.

BEGIN;

GRANT SELECT ON public.leads TO authenticated;

COMMIT;