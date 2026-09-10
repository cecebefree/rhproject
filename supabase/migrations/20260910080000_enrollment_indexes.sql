-- Migration: 20260910080000_enrollment_indexes.sql
-- Enrollment Pipeline: performance indexes

BEGIN;

-- ============================================================
-- Indexes: enrollment_pipelines
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_tenant_id
  ON office_desk.enrollment_pipelines(tenant_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_stage
  ON office_desk.enrollment_pipelines(stage);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_status
  ON office_desk.enrollment_pipelines(status);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_pipeline_type
  ON office_desk.enrollment_pipelines(pipeline_type);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_registration_id
  ON office_desk.enrollment_pipelines(registration_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_lead_id
  ON office_desk.enrollment_pipelines(lead_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_family_account_id
  ON office_desk.enrollment_pipelines(family_account_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_pipelines_form_token
  ON office_desk.enrollment_pipelines(form_token);

-- ============================================================
-- Indexes: enrollment_forms
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollment_forms_tenant_id
  ON office_desk.enrollment_forms(tenant_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_forms_pipeline_id
  ON office_desk.enrollment_forms(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_forms_status
  ON office_desk.enrollment_forms(status);

-- ============================================================
-- Indexes: contracts
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id
  ON office_desk.contracts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_contracts_pipeline_id
  ON office_desk.contracts(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_contracts_family_account_id
  ON office_desk.contracts(family_account_id);

CREATE INDEX IF NOT EXISTS idx_contracts_status
  ON office_desk.contracts(status);

CREATE INDEX IF NOT EXISTS idx_contracts_signed_by
  ON office_desk.contracts(signed_by);

-- ============================================================
-- Indexes: class_instances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_class_instances_tenant_id
  ON office_desk.class_instances(tenant_id);

CREATE INDEX IF NOT EXISTS idx_class_instances_program_id
  ON office_desk.class_instances(program_id);

CREATE INDEX IF NOT EXISTS idx_class_instances_teacher_id
  ON office_desk.class_instances(teacher_id);

CREATE INDEX IF NOT EXISTS idx_class_instances_term
  ON office_desk.class_instances(term);

CREATE INDEX IF NOT EXISTS idx_class_instances_grade
  ON office_desk.class_instances(grade);

CREATE INDEX IF NOT EXISTS idx_class_instances_status
  ON office_desk.class_instances(status);

CREATE INDEX IF NOT EXISTS idx_class_instances_day_of_week
  ON office_desk.class_instances(day_of_week);

-- ============================================================
-- Indexes: class_assignments
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_class_assignments_tenant_id
  ON office_desk.class_assignments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_class_assignments_student_id
  ON office_desk.class_assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_class_assignments_class_instance_id
  ON office_desk.class_assignments(class_instance_id);

CREATE INDEX IF NOT EXISTS idx_class_assignments_pipeline_id
  ON office_desk.class_assignments(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_class_assignments_status
  ON office_desk.class_assignments(status);

-- ============================================================
-- Indexes: student_class_enrollments
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_student_class_enrollments_tenant_id
  ON office_desk.student_class_enrollments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_student_class_enrollments_student_id
  ON office_desk.student_class_enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_student_class_enrollments_class_instance_id
  ON office_desk.student_class_enrollments(class_instance_id);

CREATE INDEX IF NOT EXISTS idx_student_class_enrollments_status
  ON office_desk.student_class_enrollments(status);

-- ============================================================
-- Indexes: enrollment_history
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollment_history_tenant_id
  ON office_desk.enrollment_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_history_student_id
  ON office_desk.enrollment_history(student_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_history_family_account_id
  ON office_desk.enrollment_history(family_account_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_history_enrollment_year
  ON office_desk.enrollment_history(enrollment_year);

-- ============================================================
-- Indexes: modified tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_family_account_id
  ON public.profiles(family_account_id);

CREATE INDEX IF NOT EXISTS idx_profiles_enrollment_pipeline_id
  ON public.profiles(enrollment_pipeline_id);

CREATE INDEX IF NOT EXISTS idx_profiles_enrollment_year
  ON public.profiles(enrollment_year);

CREATE INDEX IF NOT EXISTS idx_profiles_zone
  ON public.profiles(zone);

CREATE INDEX IF NOT EXISTS idx_profiles_class_section
  ON public.profiles(class_section);

CREATE INDEX IF NOT EXISTS idx_family_accounts_pipeline_id
  ON office_desk.family_accounts(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_registrations_pipeline_id
  ON office_desk.registrations(pipeline_id);

COMMIT;
