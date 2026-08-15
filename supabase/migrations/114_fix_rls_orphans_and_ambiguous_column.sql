-- Migration 114: Fix RLS orphans + ambiguous column (test 109/111 fixes)
--
-- 1. Drop lead_read_own_tenant from front_desk.leads (orphaned from migration 095
--    when public.leads was moved to front_desk schema by migration 100).
--    This policy has NO archived_at IS NULL filter, so archived leads remain visible.
--
-- 2. Drop overly-broad office_*_admin_all policies (from migration 101, not dropped by 111).
--    These ALL policies have NO tenant scoping — admin sees all rows across tenants.
--    Replace with tenant-scoped admin SELECT policies.
--
-- 3. Fix get_lead_pipeline() ambiguous invoice_id column reference.
--    PL/pgSQL treats output column names as local variables, causing ambiguity
--    with the payments subquery's invoice_id column.

BEGIN;

-- ============================================================
-- 1. Drop orphaned lead_read_own_tenant from front_desk.leads
-- ============================================================
DROP POLICY IF EXISTS lead_read_own_tenant ON front_desk.leads;

-- ============================================================
-- 2. Replace overly-broad admin ALL policies on office_desk tables
--    with tenant-scoped admin SELECT policies
-- ============================================================

-- registrations
DROP POLICY IF EXISTS office_registrations_admin_all ON office_desk.registrations;
CREATE POLICY office_registrations_admin_select ON office_desk.registrations
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- invoices
DROP POLICY IF EXISTS office_invoices_admin_all ON office_desk.invoices;
CREATE POLICY office_invoices_admin_select ON office_desk.invoices
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- payments
DROP POLICY IF EXISTS office_payments_admin_all ON office_desk.payments;
CREATE POLICY office_payments_admin_select ON office_desk.payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- 3. Fix get_lead_pipeline() ambiguous invoice_id
--    Qualify payments subquery columns to avoid PL/pgSQL variable conflict
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_lead_pipeline()
RETURNS TABLE (
  lead_id         uuid,
  lead_name       text,
  lead_email      text,
  lead_status     text,
  lead_created_at timestamptz,
  registration_id uuid,
  reg_status      text,
  invoice_id      uuid,
  invoice_amount  numeric,
  invoice_status  text,
  total_paid      numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tenant uuid;
BEGIN
  v_tenant := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'D-15: tenant_id is NULL';
  END IF;

  RETURN QUERY
  SELECT
    l.id              AS lead_id,
    l.name            AS lead_name,
    l.email           AS lead_email,
    l.status          AS lead_status,
    l.created_at      AS lead_created_at,
    r.id              AS registration_id,
    r.status          AS reg_status,
    inv.id            AS invoice_id,
    inv.amount        AS invoice_amount,
    inv.status        AS invoice_status,
    COALESCE(pay.total, 0) AS total_paid
  FROM front_desk.leads l
  LEFT JOIN office_desk.registrations r
    ON r.lead_reference_id = l.id AND r.deleted_at IS NULL
  LEFT JOIN office_desk.invoices inv
    ON inv.registration_id = r.id AND inv.deleted_at IS NULL
  LEFT JOIN (
    SELECT pay_inner.invoice_id AS inv_id, SUM(pay_inner.amount) AS total
      FROM office_desk.payments pay_inner
     WHERE pay_inner.status = 'confirmed'
     GROUP BY pay_inner.invoice_id
  ) pay ON pay.inv_id = inv.id
  WHERE l.tenant_id = v_tenant
    AND l.archived_at IS NULL
  ORDER BY l.created_at DESC;
END;
$function$;

COMMIT;
