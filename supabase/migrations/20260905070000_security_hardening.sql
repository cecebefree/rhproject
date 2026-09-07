-- Migration: 20260905070000_security_hardening.sql
-- Security hardening based on audit findings

BEGIN;

-- ============================================================================
-- CRITICAL: Enable RLS on tables with NO row-level security
-- ============================================================================

ALTER TABLE office_desk.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.office_desk ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.user_desks ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_desk.__reload_trigger ENABLE ROW LEVEL SECURITY;

-- contacts: office/admin can manage, others see only their own
CREATE POLICY contacts_office_all ON office_desk.contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'office')
    )
  );

-- office_desk: admin-only access
CREATE POLICY office_desk_admin_all ON office_desk.office_desk
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- user_desks: admin can manage, users can read own assignments
CREATE POLICY user_desks_admin_all ON office_desk.user_desks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY user_desks_read_own ON office_desk.user_desks
  FOR SELECT
  USING (user_id = auth.uid());

-- __reload_trigger: deny-all (trigger table, no user access needed)
CREATE POLICY reload_trigger_deny_all ON school_desk.__reload_trigger
  FOR ALL
  USING (false);

-- ============================================================================
-- HIGH: Revoke anon INSERT on school_desk and front_desk tables
-- ============================================================================

REVOKE INSERT ON school_desk.conversations FROM anon;
REVOKE INSERT ON school_desk.conversation_members FROM anon;
REVOKE INSERT ON school_desk.messages FROM anon;
REVOKE INSERT ON school_desk.enrollments FROM anon;
REVOKE INSERT ON school_desk.programs FROM anon;
REVOKE INSERT ON school_desk.announcement FROM anon;
REVOKE INSERT ON front_desk.inquiries FROM anon;

-- ============================================================================
-- HIGH: Tighten authenticated ALL policies on front_desk tables
-- ============================================================================

-- Drop overly broad policies
DROP POLICY IF EXISTS "callbacks authenticated all" ON front_desk.callbacks;
DROP POLICY IF EXISTS "email_logs authenticated all" ON front_desk.email_logs;
DROP POLICY IF EXISTS "escalations authenticated all" ON front_desk.escalations;

-- callbacks: office/admin can manage, teachers see own assigned
CREATE POLICY callbacks_office_all ON front_desk.callbacks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'office')
    )
  );

CREATE POLICY callbacks_teacher_read ON front_desk.callbacks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- email_logs: office/admin only
CREATE POLICY email_logs_office_all ON front_desk.email_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'office')
    )
  );

-- escalations: office/admin can manage, teachers read own
CREATE POLICY escalations_office_all ON front_desk.escalations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'office')
    )
  );

CREATE POLICY escalations_teacher_read ON front_desk.escalations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

COMMIT;
