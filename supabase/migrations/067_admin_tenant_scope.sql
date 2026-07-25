-- Migration 067: replace admin_all_profiles (FOR ALL, unscoped) with
-- tenant-scoped admin SELECT. Corrects privilege escalation introduced
-- in 021: any admin could read/write all profiles across tenants.
-- Claim paths verified against 056_hook_fail_loud.sql:
--   app_metadata.role (text), app_metadata.tenant_id (uuid as text).
-- Null tenant_id claim (D15 pending-assignment) is denied by equality.
-- Admin writes are NOT restored at RLS level; they route through
-- SECURITY DEFINER EFs with their own tenant guards (ref: set_handle).


BEGIN;


DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;


CREATE POLICY "admin_select_tenant_profiles" ON public.profiles
  FOR SELECT USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND tenant_id = ((auth.jwt()->'app_metadata'->>'tenant_id'))::uuid
  );


COMMIT;
