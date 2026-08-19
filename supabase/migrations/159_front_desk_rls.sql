-- Migration 159: RLS policies for Front Desk tables
-- Public can submit; staff read/update based on role and assignment

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- front_desk.inquiries RLS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE front_desk.inquiries ENABLE ROW LEVEL SECURITY;

-- Public can submit inquiries (anonymous insert via website form)
DROP POLICY IF EXISTS inquiries_insert_public ON front_desk.inquiries;
CREATE POLICY inquiries_insert_public ON front_desk.inquiries
  FOR INSERT TO anon
  WITH CHECK (true);

-- Staff read: own assignments + admin + office/school desks
DROP POLICY IF EXISTS inquiries_select_staff ON front_desk.inquiries;
CREATE POLICY inquiries_select_staff ON front_desk.inquiries
  FOR SELECT TO authenticated
  USING (
    assigned_counselor_id = auth.uid()
    OR office_desk_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid()
      AND staff_profiles.desk IN ('office', 'school')
    )
  );

-- Staff update: assigned counselor, office owner, or admin
DROP POLICY IF EXISTS inquiries_update_staff ON front_desk.inquiries;
CREATE POLICY inquiries_update_staff ON front_desk.inquiries
  FOR UPDATE TO authenticated
  USING (
    assigned_counselor_id = auth.uid()
    OR office_desk_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    assigned_counselor_id = auth.uid()
    OR office_desk_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- front_desk.activity_log RLS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE front_desk.activity_log ENABLE ROW LEVEL SECURITY;

-- Staff can read activity for inquiries they're assigned to
DROP POLICY IF EXISTS activity_log_select_staff ON front_desk.activity_log;
CREATE POLICY activity_log_select_staff ON front_desk.activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM front_desk.inquiries
      WHERE inquiries.id = activity_log.inquiry_id
      AND (
        inquiries.assigned_counselor_id = auth.uid()
        OR inquiries.office_desk_owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM public.staff_profiles
          WHERE staff_profiles.id = auth.uid()
          AND staff_profiles.desk IN ('front', 'office', 'school')
        )
      )
    )
  );

-- Staff can insert activity for any inquiry
DROP POLICY IF EXISTS activity_log_insert_staff ON front_desk.activity_log;
CREATE POLICY activity_log_insert_staff ON front_desk.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- front_desk.communication_log RLS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE front_desk.communication_log ENABLE ROW LEVEL SECURITY;

-- Staff can read comms for inquiries they're assigned to
DROP POLICY IF EXISTS comm_log_select_staff ON front_desk.communication_log;
CREATE POLICY comm_log_select_staff ON front_desk.communication_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM front_desk.inquiries
      WHERE inquiries.id = communication_log.inquiry_id
      AND (
        inquiries.assigned_counselor_id = auth.uid()
        OR inquiries.office_desk_owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM public.staff_profiles
          WHERE staff_profiles.id = auth.uid()
          AND staff_profiles.desk IN ('front', 'office', 'school')
        )
      )
    )
  );

-- Staff can insert comms
DROP POLICY IF EXISTS comm_log_insert_staff ON front_desk.communication_log;
CREATE POLICY comm_log_insert_staff ON front_desk.communication_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON front_desk.inquiries TO authenticated;
GRANT INSERT ON front_desk.inquiries TO anon;
GRANT SELECT, INSERT ON front_desk.activity_log TO authenticated;
GRANT SELECT, INSERT ON front_desk.communication_log TO authenticated;

COMMIT;
