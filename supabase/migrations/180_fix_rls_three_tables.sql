-- Migration 180: Enable RLS on 3 tables with tenant scoping via organization_id
-- Fixes critical security advisory: RLS disabled on assessment_rubric_grades, attendance_audit_log, calendar_webhook_logs

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. assessment_rubric_grades
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.assessment_rubric_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rubric_grades_org_read" ON public.assessment_rubric_grades
  FOR SELECT USING (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "rubric_grades_org_insert" ON public.assessment_rubric_grades
  FOR INSERT WITH CHECK (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "rubric_grades_org_update" ON public.assessment_rubric_grades
  FOR UPDATE USING (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "rubric_grades_admin_all" ON public.assessment_rubric_grades
  FOR ALL USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'office_admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. attendance_audit_log
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_org_read" ON public.attendance_audit_log
  FOR SELECT USING (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "audit_log_org_insert" ON public.attendance_audit_log
  FOR INSERT WITH CHECK (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "audit_log_org_update" ON public.attendance_audit_log
  FOR UPDATE USING (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "audit_log_admin_all" ON public.attendance_audit_log
  FOR ALL USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'office_admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. calendar_webhook_logs
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.calendar_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs_org_read" ON public.calendar_webhook_logs
  FOR SELECT USING (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "webhook_logs_org_insert" ON public.calendar_webhook_logs
  FOR INSERT WITH CHECK (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "webhook_logs_org_update" ON public.calendar_webhook_logs
  FOR UPDATE USING (organization_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid);

CREATE POLICY "webhook_logs_admin_all" ON public.calendar_webhook_logs
  FOR ALL USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'office_admin');

COMMIT;
