-- ============================================================================
-- Office Desk RLS: Add missing INSERT/UPDATE policies for office role
-- ============================================================================

-- 1. registrations: Add INSERT and UPDATE for office role
CREATE POLICY "office_registrations_office_insert" ON office_desk.registrations
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = jwt_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'office'
  )
);

CREATE POLICY "office_registrations_office_update" ON office_desk.registrations
FOR UPDATE TO authenticated
USING (
  tenant_id = jwt_tenant_id()
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

-- 2. payments: Add INSERT and UPDATE for office role
CREATE POLICY "office_payments_office_insert" ON office_desk.payments
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = jwt_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

CREATE POLICY "office_payments_office_update" ON office_desk.payments
FOR UPDATE TO authenticated
USING (
  tenant_id = jwt_tenant_id()
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

-- 3. family_accounts: Add SELECT for office role
CREATE POLICY "fa_office_select" ON office_desk.family_accounts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

-- 4. registrations: Add DELETE (soft) for admin only
CREATE POLICY "office_registrations_admin_delete" ON office_desk.registrations
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
