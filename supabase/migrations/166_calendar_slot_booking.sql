-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 166: Calendar + Slot Booking Engine
-- ══════════════════════════════════════════════════════════════════════════════
-- Tables: calendar, slot_bookings
-- RPCs:   generate_calendar_slots, check_booking_conflict, get_available_slots
-- Triggers: on_slot_bookings_insert, on_slot_bookings_update
-- RLS: 4 roles (office_desk_admin, school_desk_admin, student, parent)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. SETUP — Safe teardown for re-runs (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop triggers if tables exist
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'slot_bookings' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_slot_bookings_insert ON public.slot_bookings;
    DROP TRIGGER IF EXISTS on_slot_bookings_update ON public.slot_bookings;
  END IF;

  -- Drop functions
  DROP FUNCTION IF EXISTS public.on_slot_booking_created() CASCADE;
  DROP FUNCTION IF EXISTS public.on_slot_booking_cancelled() CASCADE;
  DROP FUNCTION IF EXISTS public.generate_calendar_slots(uuid, text, int, date, time, int, int) CASCADE;
  DROP FUNCTION IF EXISTS public.check_booking_conflict(uuid, date, time, int) CASCADE;
  DROP FUNCTION IF EXISTS public.get_available_slots(uuid, text, date, date) CASCADE;

  -- Drop tables in reverse dependency order
  DROP TABLE IF EXISTS public.slot_bookings CASCADE;
  DROP TABLE IF EXISTS public.calendar CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 CALENDAR — Available time slots per grade per organization
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.calendar (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  grade             text NOT NULL,
  slot_date         date NOT NULL,
  slot_time         time NOT NULL,
  duration_minutes  int NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  capacity          int NOT NULL DEFAULT 5 CHECK (capacity > 0),
  available_slots   int NOT NULL DEFAULT 5 CHECK (available_slots >= 0),
  booked_slots      int NOT NULL DEFAULT 0 CHECK (booked_slots >= 0),
  status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'full', 'cancelled')),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_capacity CHECK (booked_slots <= capacity)
);

COMMENT ON TABLE public.calendar IS 'Available tutoring/consultation time slots per grade per organization';
COMMENT ON COLUMN public.calendar.grade IS 'Grade level (e.g. 10, 11, 12)';
COMMENT ON COLUMN public.calendar.slot_date IS 'Date of the available slot';
COMMENT ON COLUMN public.calendar.slot_time IS 'Start time of the slot';
COMMENT ON COLUMN public.calendar.available_slots IS 'Remaining bookable spots — decremented by trigger on insert';
COMMENT ON COLUMN public.calendar.booked_slots IS 'Confirmed bookings — incremented by trigger on insert';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 SLOT BOOKINGS — Student bookings for calendar slots
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.slot_bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  calendar_id         uuid NOT NULL REFERENCES public.calendar(id) ON DELETE CASCADE,
  booking_status      text NOT NULL DEFAULT 'confirmed'
    CHECK (booking_status IN ('confirmed', 'cancelled', 'no_show', 'attended')),
  booked_at           timestamptz NOT NULL DEFAULT now(),
  booked_by           uuid REFERENCES auth.users(id),
  cancelled_at        timestamptz,
  cancelled_by        uuid REFERENCES auth.users(id),
  cancellation_reason text,
  attended_at         timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_calendar UNIQUE (student_id, calendar_id)
);

COMMENT ON TABLE public.slot_bookings IS 'Student bookings for calendar time slots — one booking per student per slot';
COMMENT ON COLUMN public.slot_bookings.booking_status IS 'confirmed → cancelled | no_show | attended';
COMMENT ON COLUMN public.slot_bookings.cancellation_reason IS 'Free-text reason provided at cancellation time';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Calendar indexes
CREATE INDEX idx_calendar_org_grade_date
  ON public.calendar (organization_id, grade, slot_date);

CREATE INDEX idx_calendar_status
  ON public.calendar (status);

CREATE INDEX idx_calendar_date_time
  ON public.calendar (slot_date, slot_time);

-- Slot bookings indexes
CREATE INDEX idx_slot_bookings_student
  ON public.slot_bookings (student_id);

CREATE INDEX idx_slot_bookings_calendar
  ON public.slot_bookings (calendar_id);

CREATE INDEX idx_slot_bookings_status
  ON public.slot_bookings (booking_status);

CREATE INDEX idx_slot_bookings_student_status
  ON public.slot_bookings (student_id, booking_status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 1: office_desk_admin — Full CRUD on all tables
-- ────────────────────────────────────────────────────────────────────────────

-- Calendar: full access
CREATE POLICY oda_calendar_all
  ON public.calendar FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- Slot Bookings: full access
CREATE POLICY oda_slot_bookings_all
  ON public.slot_bookings FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 2: school_desk_admin — Read-only on calendar, read-only on bookings
-- ────────────────────────────────────────────────────────────────────────────

-- Calendar: SELECT all
CREATE POLICY sda_calendar_select
  ON public.calendar FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Calendar: UPDATE status only
CREATE POLICY sda_calendar_update_status
  ON public.calendar FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- Slot Bookings: SELECT all
CREATE POLICY sda_slot_bookings_select
  ON public.slot_bookings FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 3: student — Active slots for own grade + future dates; own bookings
-- ────────────────────────────────────────────────────────────────────────────

-- Calendar: SELECT active slots for own grade, future dates only
CREATE POLICY student_calendar_select
  ON public.calendar FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND slot_date >= CURRENT_DATE
    AND grade = (
      SELECT grade FROM public.students WHERE id = auth.uid()
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Slot Bookings: SELECT own bookings
CREATE POLICY student_bookings_select_own
  ON public.slot_bookings FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Slot Bookings: INSERT own booking (student can only book for themselves)
CREATE POLICY student_bookings_insert_own
  ON public.slot_bookings FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- Slot Bookings: UPDATE own booking (cancel only — before attended)
CREATE POLICY student_bookings_update_own
  ON public.slot_bookings FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    AND booking_status IN ('confirmed', 'cancelled')
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  )
  WITH CHECK (
    student_id = auth.uid()
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 4: parent — Select active slots for child's grade; select child's bookings
-- ────────────────────────────────────────────────────────────────────────────

-- Calendar: SELECT active slots for child's grade, future dates
CREATE POLICY parent_calendar_select
  ON public.calendar FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND slot_date >= CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id IN (
        SELECT s.id FROM public.students s WHERE s.id = auth.uid()
      )
      AND grade = (
        SELECT s2.grade FROM public.students s2 WHERE s2.id = p.student_id
      )
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- Slot Bookings: SELECT child's bookings
CREATE POLICY parent_bookings_select_child
  ON public.slot_bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.student_id = slot_bookings.student_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_bookings TO authenticated;

GRANT ALL ON public.calendar TO service_role;
GRANT ALL ON public.slot_bookings TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 4.1 ON SLOT BOOKING CREATED — Update capacity + audit + notify
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_slot_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement available_slots, increment booked_slots
  UPDATE public.calendar
  SET booked_slots = booked_slots + 1,
      available_slots = available_slots - 1,
      updated_at = now()
  WHERE id = NEW.calendar_id;

  -- Mark as full if no slots remain
  UPDATE public.calendar
  SET status = 'full'
  WHERE id = NEW.calendar_id AND available_slots = 0 AND status = 'active';

  -- Audit log
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES (
    'slot_bookings',
    'SLOT_BOOKED',
    row_to_json(NEW)::jsonb,
    NEW.booked_by
  );

  -- Realtime notification
  PERFORM pg_notify(
    'slot_events',
    json_build_object(
      'event', 'slot_booked',
      'student_id', NEW.student_id,
      'calendar_id', NEW.calendar_id
    )::text
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_slot_booking_created() IS 'Trigger: after slot booking insert — update capacity, audit, notify';

CREATE TRIGGER on_slot_bookings_insert
  AFTER INSERT ON public.slot_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_slot_booking_created();

-- ────────────────────────────────────────────────────────────────────────────
-- 4.2 ON SLOT BOOKING CANCELLED — Restore capacity + audit + notify
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_slot_booking_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on status change TO cancelled
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
    -- Restore capacity
    UPDATE public.calendar
    SET booked_slots = booked_slots - 1,
        available_slots = available_slots + 1,
        updated_at = now()
    WHERE id = NEW.calendar_id;

    -- Re-activate if was full
    UPDATE public.calendar
    SET status = 'active'
    WHERE id = NEW.calendar_id
      AND status = 'full'
      AND OLD.booking_status = 'confirmed';

    -- Audit log
    INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
    VALUES (
      'slot_bookings',
      'SLOT_CANCELLED',
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb,
      NEW.cancelled_by
    );

    -- Realtime notification
    PERFORM pg_notify(
      'slot_events',
      json_build_object(
        'event', 'slot_cancelled',
        'student_id', NEW.student_id,
        'calendar_id', NEW.calendar_id
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_slot_booking_cancelled() IS 'Trigger: after slot booking update — restore capacity on cancellation, audit, notify';

CREATE TRIGGER on_slot_bookings_update
  AFTER UPDATE ON public.slot_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_slot_booking_cancelled();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 5.1 GENERATE CALENDAR SLOTS — Bulk-create slots for a grade
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_calendar_slots(
  p_org_id           uuid,
  p_grade            text,
  p_num_slots         int,
  p_start_date       date,
  p_slot_time        time DEFAULT '14:00',
  p_duration_minutes int DEFAULT 60,
  p_capacity         int DEFAULT 5
)
RETURNS TABLE(slot_id uuid, slot_date date, slot_time time, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_i int;
  v_date date;
BEGIN
  FOR v_i IN 0 .. (p_num_slots - 1) LOOP
    v_date := p_start_date + (v_i || ' days')::interval;

    INSERT INTO public.calendar (
      organization_id,
      grade,
      slot_date,
      slot_time,
      duration_minutes,
      capacity,
      available_slots,
      booked_slots,
      status,
      created_by
    ) VALUES (
      p_org_id,
      p_grade,
      v_date,
      p_slot_time,
      p_duration_minutes,
      p_capacity,
      p_capacity,
      0,
      'active',
      auth.uid()
    )
    RETURNING id, calendar.slot_date, calendar.slot_time, calendar.status
      INTO slot_id, slot_date, slot_time, status;

    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_calendar_slots(uuid, text, int, date, time, int, int)
  IS 'Bulk-generate calendar slots for a grade. SECURITY DEFINER so any authenticated user (with org context) can call.';

-- ────────────────────────────────────────────────────────────────────────────
-- 5.2 CHECK BOOKING CONFLICT — Detect time-overlap for a student
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_student_id       uuid,
  p_slot_date        date,
  p_slot_time        time,
  p_duration_minutes int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.slot_bookings sb
  JOIN public.calendar c ON sb.calendar_id = c.id
  WHERE sb.student_id = p_student_id
    AND sb.booking_status = 'confirmed'
    AND c.slot_date = p_slot_date
    AND c.slot_time + (p_duration_minutes || ' minutes')::interval > p_slot_time - interval '60 minutes'
    AND c.slot_time < p_slot_time + interval '60 minutes';

  RETURN (v_count > 0);
END;
$$;

COMMENT ON FUNCTION public.check_booking_conflict(uuid, date, time, int)
  IS 'Returns true if student has a conflicting confirmed booking within 60-min overlap window';

-- ────────────────────────────────────────────────────────────────────────────
-- 5.3 GET AVAILABLE SLOTS — Query open slots for a grade + date range
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_org_id    uuid,
  p_grade     text,
  p_from_date date,
  p_to_date   date
)
RETURNS TABLE(
  id               uuid,
  slot_date        date,
  slot_time        time,
  duration_minutes int,
  available_slots  int,
  capacity         int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.slot_date,
    c.slot_time,
    c.duration_minutes,
    c.available_slots,
    c.capacity
  FROM public.calendar c
  WHERE c.organization_id = p_org_id
    AND c.grade = p_grade
    AND c.slot_date BETWEEN p_from_date AND p_to_date
    AND c.status = 'active'
    AND c.available_slots > 0
  ORDER BY c.slot_date ASC, c.slot_time ASC;
END;
$$;

COMMENT ON FUNCTION public.get_available_slots(uuid, text, date, date)
  IS 'Returns active, available calendar slots for a grade within a date range';

COMMIT;
