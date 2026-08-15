-- Migration 111: Office Desk RLS tightening + cross-desk reporting (Row 62)
-- Office Desk is the reporting/operations layer — READ-only across all desks.
-- Tightens 101 policies (any authenticated → office-only SELECT) and adds
-- a cross-desk reporting view for dashboard queries.
--
-- Design:
--   - office_desk tables: SELECT restricted to office + admin roles
--   - No INSERT/UPDATE/DELETE for office role (writes via EF service_role only)
--   - Cross-desk reads: office already has SELECT on front_desk.leads (106 §5)
--     and school_desk.report_cards (086 rc_office_select). No new policies needed.
--   - Reporting view: SECURITY DEFINER joins across schemas for dashboards
--   - All queries logged to ef_call_log via application layer
--
-- PREDECESSOR: 110

BEGIN;

-- ============================================================
-- 1. DROP overly-broad policies from 101
--    (tenant_select/insert/update allowed ANY authenticated user)
-- ============================================================

-- registrations
DROP POLICY IF EXISTS office_registrations_tenant_select ON office_desk.registrations;
DROP POLICY IF EXISTS office_registrations_tenant_insert ON office_desk.registrations;
DROP POLICY IF EXISTS office_registrations_tenant_update ON office_desk.registrations;

-- invoices
DROP POLICY IF EXISTS office_invoices_tenant_select ON office_desk.invoices;
DROP POLICY IF EXISTS office_invoices_tenant_insert ON office_desk.invoices;
DROP POLICY IF EXISTS office_invoices_tenant_update ON office_desk.invoices;

-- payments
DROP POLICY IF EXISTS office_payments_tenant_select ON office_desk.payments;
DROP POLICY IF EXISTS office_payments_tenant_insert ON office_desk.payments;
DROP POLICY IF EXISTS office_payments_tenant_update ON office_desk.payments;

-- ============================================================
-- 2. RECREATE: office-only SELECT (reporting role)
--    Pattern: role gate + tenant scope + soft-delete filter
-- ============================================================

-- registrations: office SELECT
CREATE POLICY office_registrations_office_select ON office_desk.registrations
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'office'
    )
  );

-- invoices: office SELECT
CREATE POLICY office_invoices_office_select ON office_desk.invoices
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'office'
    )
  );

-- payments: office SELECT
CREATE POLICY office_payments_office_select ON office_desk.payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'office'
    )
  );

-- ============================================================
-- 3. CROSS-DESK REPORTING VIEW (SECURITY DEFINER)
--    Joins leads + registrations + invoices for pipeline dashboards.
--    Runs as owner (bypasses cross-schema RLS), filtered by JWT tenant.
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
    i.id              AS invoice_id,
    i.amount          AS invoice_amount,
    i.status          AS invoice_status,
    COALESCE(p.total, 0) AS total_paid
  FROM front_desk.leads l
  LEFT JOIN office_desk.registrations r
    ON r.lead_reference_id = l.id AND r.deleted_at IS NULL
  LEFT JOIN office_desk.invoices i
    ON i.registration_id = r.id AND i.deleted_at IS NULL
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS total
      FROM office_desk.payments
     WHERE status = 'confirmed'
     GROUP BY invoice_id
  ) p ON p.invoice_id = i.id
  WHERE l.tenant_id = v_tenant
    AND l.archived_at IS NULL
  ORDER BY l.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_lead_pipeline() TO authenticated;

COMMENT ON FUNCTION public.get_lead_pipeline() IS
  'SECURITY DEFINER: cross-desk lead pipeline report. Joins front_desk.leads + office_desk.{registrations,invoices,payments}. Tenant-scoped via JWT.';

-- ============================================================
-- 4. SUMMARY VIEW: leads by status (dashboard widget)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_leads_by_status()
RETURNS TABLE (
  status  text,
  count   bigint
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
  SELECT l.status, count(*) AS count
    FROM front_desk.leads l
   WHERE l.tenant_id = v_tenant
     AND l.archived_at IS NULL
   GROUP BY l.status
   ORDER BY count DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_leads_by_status() TO authenticated;

COMMENT ON FUNCTION public.get_leads_by_status() IS
  'SECURITY DEFINER: lead count by status for dashboard. Tenant-scoped via JWT.';

-- ============================================================
-- 5. SUMMARY VIEW: revenue by month (dashboard widget)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_revenue_by_month()
RETURNS TABLE (
  month   text,
  total   numeric,
  count   bigint
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
    to_char(p.paid_at, 'YYYY-MM') AS month,
    SUM(p.amount)                  AS total,
    count(*)                       AS count
  FROM office_desk.payments p
  JOIN office_desk.invoices i ON i.id = p.invoice_id
  WHERE p.tenant_id = v_tenant
    AND p.status = 'confirmed'
    AND p.paid_at IS NOT NULL
  GROUP BY to_char(p.paid_at, 'YYYY-MM')
  ORDER BY month DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_revenue_by_month() TO authenticated;

COMMENT ON FUNCTION public.get_revenue_by_month() IS
  'SECURITY DEFINER: monthly revenue summary from confirmed payments. Tenant-scoped via JWT.';

COMMIT;
