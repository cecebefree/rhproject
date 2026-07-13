-- 044_rls_for_042_043.sql (ITEM 12)
-- Granular RLS policies for consent_records, suppression_records,
-- report_cards, and certificates. Consent history mechanism fix.
-- PREDECESSOR: 043_report_cards_and_certs.sql

BEGIN;

-- 1. CONSENT RECORDS -- fix history mechanism
ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS uq_consent_per_type;
ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
COMMENT ON COLUMN public.consent_records.withdrawn_at IS 'Set when superseded -- active row = withdrawn_at IS NULL';
CREATE INDEX IF NOT EXISTS idx_consent_records_active ON public.consent_records (profile_id, consent_type) WHERE withdrawn_at IS NULL;

-- 2. RLS -- consent_records
DROP POLICY IF EXISTS consent_self_select ON public.consent_records;
CREATE POLICY consent_self_select ON public.consent_records FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS consent_self_insert ON public.consent_records;
CREATE POLICY consent_self_insert ON public.consent_records FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS consent_admin_all ON public.consent_records;
CREATE POLICY consent_admin_all ON public.consent_records FOR ALL TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 3. RLS -- suppression_records
DROP POLICY IF EXISTS suppression_self_select ON public.suppression_records;
CREATE POLICY suppression_self_select ON public.suppression_records FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS suppression_admin_all ON public.suppression_records;
CREATE POLICY suppression_admin_all ON public.suppression_records FOR ALL TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 4. RLS -- report_cards
DROP POLICY IF EXISTS rc_teacher_insert ON public.report_cards;
CREATE POLICY rc_teacher_insert ON public.report_cards FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND status = 'draft' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));
DROP POLICY IF EXISTS rc_teacher_select_own ON public.report_cards;
CREATE POLICY rc_teacher_select_own ON public.report_cards FOR SELECT TO authenticated USING (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));
DROP POLICY IF EXISTS rc_teacher_update_own ON public.report_cards;
CREATE POLICY rc_teacher_update_own ON public.report_cards FOR UPDATE TO authenticated USING (created_by = auth.uid() AND status = 'draft' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')) WITH CHECK (created_by = auth.uid() AND status = 'draft' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'));
DROP POLICY IF EXISTS rc_office_release ON public.report_cards;
CREATE POLICY rc_office_release ON public.report_cards FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'office')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'office') AND status = 'released' AND released_by = auth.uid() AND released_at IS NOT NULL);
DROP POLICY IF EXISTS rc_office_visible ON public.report_cards;
CREATE POLICY rc_office_visible ON public.report_cards FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'office')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'office') AND status = 'visible' AND visible_at IS NOT NULL);
DROP POLICY IF EXISTS rc_learner_select_visible ON public.report_cards;
CREATE POLICY rc_learner_select_visible ON public.report_cards FOR SELECT TO authenticated USING (student_id = auth.uid() AND status = 'visible' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'learner'));
DROP POLICY IF EXISTS rc_admin_all ON public.report_cards;
CREATE POLICY rc_admin_all ON public.report_cards FOR ALL TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 5. RLS -- certificates
DROP POLICY IF EXISTS cert_self_select ON public.certificates;
CREATE POLICY cert_self_select ON public.certificates FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS cert_admin_all ON public.certificates;
CREATE POLICY cert_admin_all ON public.certificates FOR ALL TO authenticated USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

COMMIT;
