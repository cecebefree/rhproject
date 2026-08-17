-- Migration 146: Enhanced RLS for office_desk.payments (Row 79)
-- Adds: office role SELECT, role-scoped UPDATE, deny anon
-- Drops existing policies and recreates with proper role granularity

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- DROP existing payment policies (recreate with better granularity)
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS office_payments_admin_all ON office_desk.payments;
DROP POLICY IF EXISTS office_payments_tenant_select ON office_desk.payments;
DROP POLICY IF EXISTS office_payments_tenant_insert ON office_desk.payments;
DROP POLICY IF EXISTS office_payments_tenant_update ON office_desk.payments;

-- ═══════════════════════════════════════════════════════════
-- ANON: deny all
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_deny_anon ON office_desk.payments
  FOR ALL TO anon
  USING (false);

-- ═══════════════════════════════════════════════════════════
-- ADMIN: full access (bypass tenant scoping)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_admin_all ON office_desk.payments
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- OFFICE: read all payments in tenant
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_office_select ON office_desk.payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- OFFICE: update status (confirm/refund operations)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_office_update ON office_desk.payments
  FOR UPDATE TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  )
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- AUTHENTICATED (non-office): read-only for own tenant
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_auth_select ON office_desk.payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- ═══════════════════════════════════════════════════════════
-- DENY: authenticated INSERT (only service_role via EFs)
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_deny_auth_insert ON office_desk.payments
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- ═══════════════════════════════════════════════════════════
-- DENY: authenticated DELETE
-- ═══════════════════════════════════════════════════════════

CREATE POLICY payments_deny_auth_delete ON office_desk.payments
  FOR DELETE TO authenticated
  USING (false);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

-- Revoke direct INSERT/UPDATE/DELETE from authenticated (only via EFs)
REVOKE INSERT, UPDATE, DELETE ON office_desk.payments FROM authenticated;

-- Grant SELECT to authenticated (RLS-gated)
GRANT SELECT ON office_desk.payments TO authenticated;

-- service_role full access (for EFs)
GRANT ALL ON office_desk.payments TO service_role;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON POLICY payments_deny_anon ON office_desk.payments IS 'Row 79: Block anon access to payments';
COMMENT ON POLICY payments_office_select ON office_desk.payments IS 'Row 79: Office/admin can read all payments in tenant';
COMMENT ON POLICY payments_office_update ON office_desk.payments IS 'Row 79: Office/admin can update payment status (confirm/refund)';
COMMENT ON POLICY payments_auth_select ON office_desk.payments IS 'Row 79: Any authenticated user can read payments in own tenant';

COMMIT;
