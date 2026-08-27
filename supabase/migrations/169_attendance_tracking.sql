-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 169: Attendance Tracking
-- ══════════════════════════════════════════════════════════════════════════════
-- Tables:   class_sessions, student_attendance, attendance_audit_log
-- RPCs:     mark_student_attendance, start_class_session, end_class_session,
--           get_student_attendance_report, get_course_attendance_summary
-- Triggers: on_student_attendance_update
-- RLS:      5 roles (office_desk_admin, school_desk_admin, teacher, student, parent)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. SETUP — Safe teardown for re-runs (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop triggers
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'student_attendance' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_student_attendance_update ON public.student_attendance;
  END IF;

  -- Drop functions
  DROP FUNCTION IF EXISTS public.log_attendance_change() CASCADE;
  DROP FUNCTION IF EXISTS public.mark_student_attendance(uuid, uuid, text, text, uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.start_class_session(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.end_class_session(uuid, text) CASCADE;
  DROP FUNCTION IF EXISTS public.get_student_attendance_report(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.get_course_attendance_summary(uuid) CASCADE;

  -- Drop tables in reverse dependency order
  DROP TABLE IF EXISTS public.attendance_audit_log CASCADE;
  DROP TABLE IF EXISTS public.student_attendance CASCADE;
  DROP TABLE IF EXISTS public.class_sessions CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 CLASS SESSIONS — Scheduled/ongoing/completed class instances
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.class_sessions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  course_id                 uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  calendar_sync_event_id    uuid REFERENCES public.calendar_sync_events(id) ON DELETE SET NULL,
  meeting_link_id           uuid REFERENCES public.meeting_links(id) ON DELETE SET NULL,
  session_title             text NOT NULL,
  session_start             timestamptz NOT NULL,
  session_end               timestamptz,
  session_status            text NOT NULL DEFAULT 'scheduled'
    CHECK (session_status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  session_duration_minutes  int GENERATED ALWAYS AS (
    CASE WHEN session_end IS NOT NULL
      THEN EXTRACT(EPOCH FROM (session_end - session_start)) / 60
      ELSE NULL
    END
  ) STORED,
  host_id                   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes                     text,
  recording_url             text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_session_times CHECK (session_end IS NULL OR session_end > session_start)
);

COMMENT ON TABLE public.class_sessions IS 'Scheduled class instances — linked to courses, optionally to calendar sync events and meeting links';
COMMENT ON COLUMN public.class_sessions.session_status IS 'scheduled → in_progress → completed | cancelled';
COMMENT ON COLUMN public.class_sessions.session_duration_minutes IS 'Auto-calculated from session_start to session_end (stored, nullable until ended)';
COMMENT ON COLUMN public.class_sessions.host_id IS 'Teacher/user hosting the session (FK to public.users)';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 STUDENT ATTENDANCE — Per-student per-session attendance record
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.student_attendance (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  class_session_id            uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  enrollment_id               uuid NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
  student_id                  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_status           text NOT NULL DEFAULT 'absent'
    CHECK (attendance_status IN ('present', 'absent', 'late', 'excused')),
  marked_by_user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  marked_at                   timestamptz NOT NULL DEFAULT now(),
  check_in_time               timestamptz,
  check_out_time              timestamptz,
  attendance_duration_minutes int GENERATED ALWAYS AS (
    CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 60
      ELSE NULL
    END
  ) STORED,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_session_enrollment UNIQUE (class_session_id, enrollment_id)
);

COMMENT ON TABLE public.student_attendance IS 'Per-student per-session attendance — one row per student per class session';
COMMENT ON COLUMN public.student_attendance.attendance_status IS 'present | absent | late | excused';
COMMENT ON COLUMN public.student_attendance.check_in_time IS 'Auto-recorded when student joins meeting (nullable)';
COMMENT ON COLUMN public.student_attendance.check_out_time IS 'Auto-recorded when student leaves meeting (nullable)';
COMMENT ON COLUMN public.student_attendance.attendance_duration_minutes IS 'Auto-calculated from check_in to check_out (stored, nullable)';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 ATTENDANCE AUDIT LOG — Compliance trail for attendance changes
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.attendance_audit_log (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  student_attendance_id   uuid NOT NULL REFERENCES public.student_attendance(id) ON DELETE CASCADE,
  changed_by_user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  old_status              text,
  new_status              text,
  old_marked_at           timestamptz,
  new_marked_at           timestamptz,
  change_reason           text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.attendance_audit_log IS 'Immutable compliance trail for attendance status changes';
COMMENT ON COLUMN public.attendance_audit_log.old_status IS 'Previous attendance_status (NULL on first mark)';
COMMENT ON COLUMN public.attendance_audit_log.new_status IS 'New attendance_status';
COMMENT ON COLUMN public.attendance_audit_log.change_reason IS 'Reason for change (e.g. Manual update, Auto-checkin)';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Class sessions indexes
CREATE INDEX idx_sessions_org
  ON public.class_sessions (organization_id);

CREATE INDEX idx_sessions_course
  ON public.class_sessions (course_id);

CREATE INDEX idx_sessions_status
  ON public.class_sessions (session_status);

CREATE INDEX idx_sessions_date_range
  ON public.class_sessions (session_start, session_end);

CREATE INDEX idx_sessions_host
  ON public.class_sessions (host_id);

-- Student attendance indexes
CREATE INDEX idx_attendance_org
  ON public.student_attendance (organization_id);

CREATE INDEX idx_attendance_session
  ON public.student_attendance (class_session_id);

CREATE INDEX idx_attendance_student
  ON public.student_attendance (student_id);

CREATE INDEX idx_attendance_enrollment
  ON public.student_attendance (enrollment_id);

CREATE INDEX idx_attendance_status
  ON public.student_attendance (attendance_status);

-- Attendance audit log indexes
CREATE INDEX idx_audit_org
  ON public.attendance_audit_log (organization_id);

CREATE INDEX idx_audit_student_attendance
  ON public.attendance_audit_log (student_attendance_id);

CREATE INDEX idx_audit_created
  ON public.attendance_audit_log (created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Audit log: RLS disabled (internal-only, written by SECURITY DEFINER functions)

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 1: office_desk_admin — Full CRUD on all tables
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY oda_sessions_all
  ON public.class_sessions FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

CREATE POLICY oda_attendance_all
  ON public.student_attendance FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 2: school_desk_admin — Read all, limited write
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY sda_sessions_select
  ON public.class_sessions FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_sessions_update_status
  ON public.class_sessions FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_attendance_select
  ON public.student_attendance FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_attendance_insert
  ON public.student_attendance FOR INSERT TO authenticated
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_attendance_update
  ON public.student_attendance FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 3: teacher — Own sessions, own session attendance
-- ────────────────────────────────────────────────────────────────────────────

-- Sessions: SELECT own, INSERT/UPDATE own, no DELETE
CREATE POLICY teacher_sessions_select
  ON public.class_sessions FOR SELECT TO authenticated
  USING (
    host_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

CREATE POLICY teacher_sessions_insert
  ON public.class_sessions FOR INSERT TO authenticated
  WITH CHECK (
    host_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

CREATE POLICY teacher_sessions_update
  ON public.class_sessions FOR UPDATE TO authenticated
  USING (
    host_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  )
  WITH CHECK (
    host_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

-- Attendance: SELECT/INSERT/UPDATE own sessions' attendance
CREATE POLICY teacher_attendance_select
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = student_attendance.class_session_id
        AND cs.host_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

CREATE POLICY teacher_attendance_insert
  ON public.student_attendance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = student_attendance.class_session_id
        AND cs.host_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

CREATE POLICY teacher_attendance_update
  ON public.student_attendance FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = student_attendance.class_session_id
        AND cs.host_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = student_attendance.class_session_id
        AND cs.host_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 4: student — SELECT own sessions + own attendance only
-- ────────────────────────────────────────────────────────────────────────────

-- Sessions: SELECT enrolled course sessions only
CREATE POLICY student_sessions_select
  ON public.class_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      WHERE se.course_id = class_sessions.course_id
        AND se.student_id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Attendance: SELECT own only
CREATE POLICY student_attendance_select_own
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 5: parent — SELECT child's course sessions + child's attendance
-- ────────────────────────────────────────────────────────────────────────────

-- Sessions: SELECT child's course sessions
CREATE POLICY parent_sessions_select
  ON public.class_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id IN (
        SELECT se.student_id FROM public.student_enrollments se
        WHERE se.course_id = class_sessions.course_id
      )
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Attendance: SELECT child's attendance
CREATE POLICY parent_attendance_select_child
  ON public.student_attendance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id = student_attendance.student_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance TO authenticated;
GRANT SELECT, INSERT ON public.attendance_audit_log TO authenticated;

GRANT ALL ON public.class_sessions TO service_role;
GRANT ALL ON public.student_attendance TO service_role;
GRANT ALL ON public.attendance_audit_log TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 4.1 LOG ATTENDANCE CHANGES — Compliance audit on status update
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if attendance_status actually changed
  IF OLD.attendance_status IS DISTINCT FROM NEW.attendance_status THEN
    INSERT INTO public.attendance_audit_log (
      organization_id,
      student_attendance_id,
      changed_by_user_id,
      old_status,
      new_status,
      old_marked_at,
      new_marked_at,
      change_reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.marked_by_user_id,
      OLD.attendance_status,
      NEW.attendance_status,
      OLD.marked_at,
      NEW.marked_at,
      'Manual update'
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_attendance_change() IS 'Trigger: after attendance update — logs status changes to compliance audit trail';

CREATE TRIGGER on_student_attendance_update
  AFTER UPDATE ON public.student_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.log_attendance_change();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 5.1 MARK STUDENT ATTENDANCE — Create or update attendance for a session
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_student_attendance(
  p_session_id          uuid,
  p_enrollment_id       uuid,
  p_attendance_status   text,
  p_notes               text DEFAULT NULL,
  p_marked_by_user_id   uuid DEFAULT NULL
)
RETURNS TABLE(attendance_id uuid, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id       uuid;
  v_student_id   uuid;
  v_existing_id  uuid;
  v_old_status   text;
  v_current_user uuid;
BEGIN
  -- Validate attendance status
  IF p_attendance_status NOT IN ('present', 'absent', 'late', 'excused') THEN
    RAISE EXCEPTION 'Invalid attendance_status: %. Must be present, absent, late, or excused', p_attendance_status;
  END IF;

  -- Resolve current user from auth.uid()
  v_current_user := COALESCE(p_marked_by_user_id, auth.uid());

  -- Get session details
  SELECT cs.organization_id INTO v_org_id
  FROM public.class_sessions cs
  WHERE cs.id = p_session_id;

  IF NOT FOUND THEN
    attendance_id := NULL;
    status := 'error';
    message := 'Class session not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Get enrollment details
  SELECT se.student_id INTO v_student_id
  FROM public.student_enrollments se
  WHERE se.id = p_enrollment_id;

  IF NOT FOUND THEN
    attendance_id := NULL;
    status := 'error';
    message := 'Enrollment not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if attendance record already exists
  SELECT sa.id, sa.attendance_status INTO v_existing_id, v_old_status
  FROM public.student_attendance sa
  WHERE sa.class_session_id = p_session_id
    AND sa.enrollment_id = p_enrollment_id;

  IF FOUND THEN
    -- Update existing record
    UPDATE public.student_attendance
    SET attendance_status = p_attendance_status,
        marked_by_user_id = v_current_user,
        marked_at = now(),
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = v_existing_id;

    attendance_id := v_existing_id;

    -- Audit log for status change
    IF v_old_status IS DISTINCT FROM p_attendance_status THEN
      INSERT INTO public.attendance_audit_log (
        organization_id, student_attendance_id, changed_by_user_id,
        old_status, new_status, old_marked_at, new_marked_at, change_reason
      ) VALUES (
        v_org_id, v_existing_id, v_current_user,
        v_old_status, p_attendance_status, NULL, now(), 'Manual update'
      );
    END IF;
  ELSE
    -- Insert new record
    INSERT INTO public.student_attendance (
      organization_id, class_session_id, enrollment_id, student_id,
      attendance_status, marked_by_user_id, marked_at, notes
    ) VALUES (
      v_org_id, p_session_id, p_enrollment_id, v_student_id,
      p_attendance_status, v_current_user, now(), p_notes
    )
    RETURNING id INTO attendance_id;
  END IF;

  -- Sync with course_progress if present or late
  IF p_attendance_status IN ('present', 'late') THEN
    UPDATE public.student_enrollments
    SET attendance_count = (
      SELECT COUNT(*) FROM public.student_attendance
      WHERE enrollment_id = p_enrollment_id
        AND attendance_status IN ('present', 'late')
    ),
    updated_at = now()
    WHERE id = p_enrollment_id;
  ELSIF p_attendance_status = 'absent' THEN
    UPDATE public.student_enrollments
    SET absence_count = (
      SELECT COUNT(*) FROM public.student_attendance
      WHERE enrollment_id = p_enrollment_id
        AND attendance_status = 'absent'
    ),
    updated_at = now()
    WHERE id = p_enrollment_id;
  ELSIF p_attendance_status = 'late' THEN
    -- Already handled above, but update late_count separately
    UPDATE public.student_enrollments
    SET late_count = (
      SELECT COUNT(*) FROM public.student_attendance
      WHERE enrollment_id = p_enrollment_id
        AND attendance_status = 'late'
    ),
    updated_at = now()
    WHERE id = p_enrollment_id;
  END IF;

  -- Realtime notification
  PERFORM pg_notify(
    'attendance',
    json_build_object(
      'event', 'attendance_marked',
      'session_id', p_session_id,
      'enrollment_id', p_enrollment_id,
      'status', p_attendance_status
    )::text
  );

  status := 'success';
  message := 'Attendance marked';
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.mark_student_attendance(uuid, uuid, text, text, uuid)
  IS 'Create or update student attendance for a class session — syncs counts to enrollment';

GRANT EXECUTE ON FUNCTION public.mark_student_attendance(uuid, uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_student_attendance(uuid, uuid, text, text, uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.2 START CLASS SESSION — Transition scheduled → in_progress, init attendance
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_class_session(
  p_session_id uuid
)
RETURNS TABLE(status text, message text, session_start timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id  uuid;
  v_org_id     uuid;
  v_enrollment record;
BEGIN
  -- Update session status
  UPDATE public.class_sessions
  SET session_status = 'in_progress',
      session_start = CASE WHEN session_start IS NULL THEN now() ELSE session_start END,
      updated_at = now()
  WHERE id = p_session_id
    AND session_status = 'scheduled'
  RETURNING course_id, organization_id INTO v_course_id, v_org_id;

  IF NOT FOUND THEN
    status := 'error';
    message := 'Session not found or not in scheduled status';
    session_start := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Initialize attendance for all enrolled students (default: absent)
  FOR v_enrollment IN
    SELECT se.id AS enrollment_id, se.student_id
    FROM public.student_enrollments se
    WHERE se.course_id = v_course_id
      AND se.enrollment_status IN ('enrolled', 'active')
  LOOP
    INSERT INTO public.student_attendance (
      organization_id, class_session_id, enrollment_id, student_id,
      attendance_status, marked_at
    ) VALUES (
      v_org_id, p_session_id, v_enrollment.enrollment_id, v_enrollment.student_id,
      'absent', now()
    )
    ON CONFLICT (class_session_id, enrollment_id) DO NOTHING;
  END LOOP;

  -- Realtime notification
  PERFORM pg_notify(
    'sessions',
    json_build_object(
      'event', 'session_started',
      'session_id', p_session_id
    )::text
  );

  status := 'success';
  message := 'Session started, attendance initialized';
  session_start := now();
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.start_class_session(uuid)
  IS 'Start a class session — transitions to in_progress and initializes absent attendance for all enrolled students';

GRANT EXECUTE ON FUNCTION public.start_class_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_class_session(uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.3 END CLASS SESSION — Transition in_progress → completed, summary
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.end_class_session(
  p_session_id    uuid,
  p_recording_url text DEFAULT NULL
)
RETURNS TABLE(status text, message text, attendance_summary jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  -- Update session status
  UPDATE public.class_sessions
  SET session_status = 'completed',
      session_end = now(),
      recording_url = COALESCE(p_recording_url, recording_url),
      updated_at = now()
  WHERE id = p_session_id
    AND session_status = 'in_progress';

  IF NOT FOUND THEN
    status := 'error';
    message := 'Session not found or not in progress';
    attendance_summary := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Build attendance summary
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'present', COUNT(*) FILTER (WHERE attendance_status = 'present'),
    'late', COUNT(*) FILTER (WHERE attendance_status = 'late'),
    'absent', COUNT(*) FILTER (WHERE attendance_status = 'absent'),
    'excused', COUNT(*) FILTER (WHERE attendance_status = 'excused')
  ) INTO v_summary
  FROM public.student_attendance
  WHERE class_session_id = p_session_id;

  -- Audit log
  INSERT INTO public.audit_log (table_name, operation, record_id, new_values, user_id)
  VALUES (
    'class_sessions',
    'CLASS_SESSION_ENDED',
    p_session_id,
    jsonb_build_object('status', 'completed', 'attendance_summary', v_summary),
    auth.uid()
  );

  -- Realtime notification
  PERFORM pg_notify(
    'sessions',
    json_build_object(
      'event', 'session_ended',
      'session_id', p_session_id,
      'summary', v_summary
    )::text
  );

  status := 'success';
  message := 'Session ended';
  attendance_summary := v_summary;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.end_class_session(uuid, text)
  IS 'End a class session — transitions to completed, builds attendance summary, audits';

GRANT EXECUTE ON FUNCTION public.end_class_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_class_session(uuid, text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.4 GET STUDENT ATTENDANCE REPORT — Per-session attendance for an enrollment
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_student_attendance_report(
  p_enrollment_id uuid
)
RETURNS TABLE(
  class_session_id           uuid,
  session_title              text,
  session_date               timestamptz,
  attendance_status          text,
  attendance_duration_minutes int,
  notes                      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.session_title,
    cs.session_start,
    sa.attendance_status,
    sa.attendance_duration_minutes,
    sa.notes
  FROM public.student_attendance sa
  JOIN public.class_sessions cs ON sa.class_session_id = cs.id
  WHERE sa.enrollment_id = p_enrollment_id
  ORDER BY cs.session_start DESC;
END;
$$;

COMMENT ON FUNCTION public.get_student_attendance_report(uuid)
  IS 'Returns per-session attendance history for a given enrollment';

GRANT EXECUTE ON FUNCTION public.get_student_attendance_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_attendance_report(uuid) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.5 GET COURSE ATTENDANCE SUMMARY — Aggregated attendance per student
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_course_attendance_summary(
  p_course_id uuid
)
RETURNS TABLE(
  enrollment_id     uuid,
  student_name      text,
  total_sessions    bigint,
  attended_sessions bigint,
  absent_sessions   bigint,
  attendance_rate   numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS enrollment_id,
    u.full_name AS student_name,
    COUNT(DISTINCT cs.id) AS total_sessions,
    COUNT(DISTINCT CASE
      WHEN sa.attendance_status IN ('present', 'late') THEN cs.id
    END) AS attended_sessions,
    COUNT(DISTINCT CASE
      WHEN sa.attendance_status = 'absent' THEN cs.id
    END) AS absent_sessions,
    ROUND(
      COUNT(DISTINCT CASE
        WHEN sa.attendance_status IN ('present', 'late') THEN cs.id
      END)::numeric /
      NULLIF(COUNT(DISTINCT cs.id), 0) * 100,
      2
    ) AS attendance_rate
  FROM public.student_enrollments e
  JOIN public.users u ON e.student_id = u.student_id
  LEFT JOIN public.student_attendance sa ON e.id = sa.enrollment_id
  LEFT JOIN public.class_sessions cs ON sa.class_session_id = cs.id
    AND cs.session_status = 'completed'
  WHERE e.course_id = p_course_id
  GROUP BY e.id, u.full_name
  ORDER BY attendance_rate DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_course_attendance_summary(uuid)
  IS 'Returns aggregated attendance stats per student for a course — total, attended, absent, rate';

GRANT EXECUTE ON FUNCTION public.get_course_attendance_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_attendance_summary(uuid) TO service_role;

COMMIT;
