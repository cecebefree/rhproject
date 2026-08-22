-- Migration 183: Office Desk Corrected Schema — RLS Policies
-- Roles: office_desk_admin, school_desk_admin, student, parent

BEGIN;

-- ENABLE RLS
ALTER TABLE office_desk.family_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.debit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.add_on_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.family_activity ENABLE ROW LEVEL SECURITY;

-- JWT HELPERS
CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS UUID AS $fn$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid;
$fn$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT AS $fn$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$fn$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. FAMILY_ACCOUNTS
CREATE POLICY fa_admin_all ON office_desk.family_accounts
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY fa_tenant_select ON office_desk.family_accounts
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());

-- 2. USERS
CREATE POLICY users_admin_all ON office_desk.users
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY users_tenant_select ON office_desk.users
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY users_parent_select_children ON office_desk.users
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()) AND user_type = 'student');
CREATE POLICY users_parent_update_own ON office_desk.users
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() AND user_type = 'adult')
  WITH CHECK (auth_user_id = auth.uid() AND user_type = 'adult');

-- 3. STUDENTS
CREATE POLICY students_admin_all ON office_desk.students
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY students_tenant_select ON office_desk.students
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY students_school_desk_read ON office_desk.students
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'school_desk_admin' AND tenant_id = public.jwt_tenant_id());
CREATE POLICY students_parent_select ON office_desk.students
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()));
CREATE POLICY students_own_select ON office_desk.students
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM office_desk.users WHERE auth_user_id = auth.uid()));

-- 4. PACKAGES
CREATE POLICY pkg_admin_all ON office_desk.packages
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY pkg_tenant_select ON office_desk.packages
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());

-- 5. INVOICES
CREATE POLICY inv_admin_all ON office_desk.invoices
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY inv_tenant_select ON office_desk.invoices
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY inv_school_desk_read ON office_desk.invoices
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'school_desk_admin' AND tenant_id = public.jwt_tenant_id());
CREATE POLICY inv_parent_select ON office_desk.invoices
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()));

-- 6. DEBIT_ORDERS
CREATE POLICY dbo_admin_all ON office_desk.debit_orders
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY dbo_tenant_select ON office_desk.debit_orders
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY dbo_parent_select ON office_desk.debit_orders
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()));
CREATE POLICY dbo_student_select ON office_desk.debit_orders
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM office_desk.users WHERE auth_user_id = auth.uid()));

-- 7. PAYMENTS
CREATE POLICY pay_admin_all ON office_desk.payments
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY pay_tenant_select ON office_desk.payments
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY pay_school_desk_read ON office_desk.payments
  FOR SELECT TO authenticated
  USING (public.jwt_role() = 'school_desk_admin' AND tenant_id = public.jwt_tenant_id());
CREATE POLICY pay_parent_select ON office_desk.payments
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()));

-- 8. ADD_ON_PAYMENTS
CREATE POLICY addon_admin_all ON office_desk.add_on_payments
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY addon_tenant_select ON office_desk.add_on_payments
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY addon_parent_select ON office_desk.add_on_payments
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()));

-- 9. FAMILY_ACTIVITY
CREATE POLICY fam_admin_all ON office_desk.family_activity
  FOR ALL TO authenticated
  USING (public.jwt_role() = 'office_desk_admin')
  WITH CHECK (public.jwt_role() = 'office_desk_admin');
CREATE POLICY fam_tenant_select ON office_desk.family_activity
  FOR SELECT TO authenticated
  USING (tenant_id = public.jwt_tenant_id());
CREATE POLICY fam_parent_select ON office_desk.family_activity
  FOR SELECT TO authenticated
  USING (family_account_id IN (SELECT id FROM office_desk.family_accounts WHERE tenant_id = public.jwt_tenant_id()));

COMMIT;
