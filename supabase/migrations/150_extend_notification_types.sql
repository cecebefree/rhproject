-- Migration 150: Extend notification types for Row 74 events
-- Adds: registration_approved, grade_posted, attendance_logged, message_received
-- Adds: data JSONB column for metadata, INSERT policy for system inserts

BEGIN;

-- 1. Drop old CHECK constraint and add expanded one
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'announcement',
    'enrolment',
    'schedule',
    'system',
    'mention',
    'registration_approved',
    'grade_posted',
    'attendance_logged',
    'message_received'
  ));

-- 2. Add data JSONB column for event metadata (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'data'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN data jsonb DEFAULT '{}';
  END IF;
END $$;

-- 3. Add INSERT policy so server-side functions can create notifications
-- (service_role bypasses RLS, but this allows authenticated callers too)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'notif_system_insert'
      AND tablename = 'notifications'
  ) THEN
    CREATE POLICY notif_system_insert ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Add message column alias (body is already there, but service uses 'message')
-- The existing table has 'body' — our service writes to 'body'. No change needed.

-- 5. Index for data column queries
CREATE INDEX IF NOT EXISTS idx_notifications_data
  ON public.notifications USING gin (data);

COMMIT;
