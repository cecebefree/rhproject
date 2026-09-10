-- Migration: 20260910070000_enrollment_rls_policies.sql
-- Enrollment Pipeline: Row Level Security policies for all new tables

BEGIN;

-- ============================================================
-- Helper: check if user has office/admin role
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_office_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('office', 'admin')
    AND registration_status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: office_desk.enrollment_pipelines
-- ============================================================
ALTER TABLE office_desk.enrollment_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view all pipelines"
  ON office_desk.enrollment_pipelines FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert pipelines"
  ON office_desk.enrollment_pipelines FOR INSERT
  WITH CHECK (public.is_office_or_admin());

CREATE POLICY "Office/admin can update pipelines"
  ON office_desk.enrollment_pipelines FOR UPDATE
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can delete pipelines"
  ON office_desk.enrollment_pipelines FOR DELETE
  USING (public.is_office_or_admin());

-- ============================================================
-- RLS: office_desk.enrollment_forms
-- ============================================================
ALTER TABLE office_desk.enrollment_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view all forms"
  ON office_desk.enrollment_forms FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert forms"
  ON office_desk.enrollment_forms FOR INSERT
  WITH CHECK (public.is_office_or_admin());

CREATE POLICY "Office/admin can update forms"
  ON office_desk.enrollment_forms FOR UPDATE
  USING (public.is_office_or_admin());

-- ============================================================
-- RLS: office_desk.contracts
-- ============================================================
ALTER TABLE office_desk.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view all contracts"
  ON office_desk.contracts FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert contracts"
  ON office_desk.contracts FOR INSERT
  WITH CHECK (public.is_office_or_admin());

CREATE POLICY "Office/admin can update contracts"
  ON office_desk.contracts FOR UPDATE
  USING (public.is_office_or_admin());

-- ============================================================
-- RLS: office_desk.class_instances
-- ============================================================
ALTER TABLE office_desk.class_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view all class instances"
  ON office_desk.class_instances FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert class instances"
  ON office_desk.class_instances FOR INSERT
  WITH CHECK (public.is_office_or_admin());

CREATE POLICY "Office/admin can update class instances"
  ON office_desk.class_instances FOR UPDATE
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can delete class instances"
  ON office_desk.class_instances FOR DELETE
  USING (public.is_office_or_admin());

-- ============================================================
-- RLS: office_desk.class_assignments
-- ============================================================
ALTER TABLE office_desk.class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view all assignments"
  ON office_desk.class_assignments FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert assignments"
  ON office_desk.class_assignments FOR INSERT
  WITH CHECK (public.is_office_or_admin());

CREATE POLICY "Office/admin can update assignments"
  ON office_desk.class_assignments FOR UPDATE
  USING (public.is_office_or_admin());

-- ============================================================
-- RLS: office_desk.student_class_enrollments
-- ============================================================
ALTER TABLE office_desk.student_class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view all enrollments"
  ON office_desk.student_class_enrollments FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert enrollments"
  ON office_desk.student_class_enrollments FOR INSERT
  WITH CHECK (public.is_office_or_admin());

CREATE POLICY "Office/admin can update enrollments"
  ON office_desk.student_class_enrollments FOR UPDATE
  USING (public.is_office_or_admin());

-- ============================================================
-- RLS: office_desk.enrollment_history
-- ============================================================
ALTER TABLE office_desk.enrollment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Office/admin can view enrollment history"
  ON office_desk.enrollment_history FOR SELECT
  USING (public.is_office_or_admin());

CREATE POLICY "Office/admin can insert enrollment history"
  ON office_desk.enrollment_history FOR INSERT
  WITH CHECK (public.is_office_or_admin());

-- ============================================================
-- RLS: service_role bypass (Edge Functions use service_role)
-- ============================================================
-- Edge Functions use service_role which bypasses RLS by default.
-- These policies are for client-side (browser) access only.

COMMIT;
