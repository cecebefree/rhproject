-- Migration 101: RLS policies for office_desk (Row 53 follow-up)
-- 12 policies: 3 tables x 4 each
-- Pattern: admin_all bypass + tenant_select (soft-delete filtered) + tenant_insert + tenant_update

-- ═══════════════════════════════════════════════════════════
-- ENABLE RLS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE office_desk.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.payments ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- office_desk.registrations (4 policies)
-- ═══════════════════════════════════════════════════════════
CREATE POLICY office_registrations_admin_all
  ON office_desk.registrations FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

CREATE POLICY office_registrations_tenant_select
  ON office_desk.registrations FOR SELECT TO authenticated
  USING (tenant_id = jwt_tenant_id() AND deleted_at IS NULL);

CREATE POLICY office_registrations_tenant_insert
  ON office_desk.registrations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = jwt_tenant_id());

CREATE POLICY office_registrations_tenant_update
  ON office_desk.registrations FOR UPDATE TO authenticated
  USING (tenant_id = jwt_tenant_id())
  WITH CHECK (tenant_id = jwt_tenant_id());

-- ═══════════════════════════════════════════════════════════
-- office_desk.invoices (4 policies)
-- ═══════════════════════════════════════════════════════════
CREATE POLICY office_invoices_admin_all
  ON office_desk.invoices FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

CREATE POLICY office_invoices_tenant_select
  ON office_desk.invoices FOR SELECT TO authenticated
  USING (tenant_id = jwt_tenant_id() AND deleted_at IS NULL);

CREATE POLICY office_invoices_tenant_insert
  ON office_desk.invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = jwt_tenant_id());

CREATE POLICY office_invoices_tenant_update
  ON office_desk.invoices FOR UPDATE TO authenticated
  USING (tenant_id = jwt_tenant_id())
  WITH CHECK (tenant_id = jwt_tenant_id());

-- ═══════════════════════════════════════════════════════════
-- office_desk.payments (4 policies)
-- ═══════════════════════════════════════════════════════════
CREATE POLICY office_payments_admin_all
  ON office_desk.payments FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

CREATE POLICY office_payments_tenant_select
  ON office_desk.payments FOR SELECT TO authenticated
  USING (tenant_id = jwt_tenant_id() AND deleted_at IS NULL);

CREATE POLICY office_payments_tenant_insert
  ON office_desk.payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = jwt_tenant_id());

CREATE POLICY office_payments_tenant_update
  ON office_desk.payments FOR UPDATE TO authenticated
  USING (tenant_id = jwt_tenant_id())
  WITH CHECK (tenant_id = jwt_tenant_id());
