-- Migration 190: notification_preferences for class-start-ping
-- Replaces the per-type notification_preferences from 173 with a
-- class-notification-focused schema that controls:
--   - scope of class notifications (all / custom / off)
--   - core vs club curriculum toggles
--   - per-class custom list
--   - hub event types and news categories
--   - quiet hours window (22:00–08:00)

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. Drop old per-type notification_preferences (migration 173)
-- ═══════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- ═══════════════════════════════════════════════════════════
-- 2. New notification_preferences table
--    Grain: one row per student (student_id UNIQUE).
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.notification_preferences (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,

  -- Class notification scope: 'all' = every class, 'custom' = only class_ids, 'off' = none
  class_notification_scope TEXT NOT NULL DEFAULT 'all'
    CHECK (class_notification_scope IN ('all', 'custom', 'off')),

  -- Curriculum-level toggles
  core_curriculum_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  clubs_enabled            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Custom class list (used when class_notification_scope = 'custom')
  class_ids                UUID[] DEFAULT ARRAY[]::UUID[],

  -- Channel toggles
  push_enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  sms_enabled              BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_enabled           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Hub / enrichment event types the student wants (e.g. 'club_news')
  hub_event_types          TEXT[] DEFAULT ARRAY['club_news']::TEXT[],

  -- News categories the student subscribes to (e.g. 'club_news')
  news_categories          TEXT[] DEFAULT ARRAY['club_news']::TEXT[],

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notification_preferences IS 'Per-student class-start-ping and notification channel preferences (migration 190)';
COMMENT ON COLUMN public.notification_preferences.class_notification_scope IS 'all = notify for every enrolled class, custom = only classes in class_ids, off = no class pings';
COMMENT ON COLUMN public.notification_preferences.core_curriculum_enabled IS 'When true, send pings for core curriculum classes';
COMMENT ON COLUMN public.notification_preferences.clubs_enabled IS 'When true, send pings for club/enrichment classes';
COMMENT ON COLUMN public.notification_preferences.class_ids IS 'Explicit class UUIDs to notify for when scope = custom (both core and club IDs allowed)';
COMMENT ON COLUMN public.notification_preferences.hub_event_types IS 'Event types the student wants from the Hub (e.g. club_news)';
COMMENT ON COLUMN public.notification_preferences.news_categories IS 'News categories the student subscribes to (e.g. club_news)';

-- ═══════════════════════════════════════════════════════════
-- 3. Indexes
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_notification_preferences_student
  ON public.notification_preferences (student_id);

-- GIN index for class_ids array lookups (custom scope queries)
CREATE INDEX idx_notification_preferences_class_ids
  ON public.notification_preferences USING gin (class_ids);

-- ═══════════════════════════════════════════════════════════
-- 4. updated_at trigger
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_preferences_updated_at();

-- ═══════════════════════════════════════════════════════════
-- 5. Row Level Security
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Students read their own preferences
DROP POLICY IF EXISTS notif_prefs_student_select ON public.notification_preferences;
CREATE POLICY notif_prefs_student_select ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students insert/update their own preferences
DROP POLICY IF EXISTS notif_prefs_student_insert ON public.notification_preferences;
CREATE POLICY notif_prefs_student_insert ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS notif_prefs_student_update ON public.notification_preferences;
CREATE POLICY notif_prefs_student_update ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Service role full access (Edge Functions use service_role)
DROP POLICY IF EXISTS notif_prefs_service_role_all ON public.notification_preferences;
CREATE POLICY notif_prefs_service_role_all ON public.notification_preferences
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- 6. Grants
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- ═══════════════════════════════════════════════════════════
-- 7. RPC: get_or_create_notification_preferences
--     Returns existing row or inserts defaults and returns it.
--     Used by Edge Functions and client alike.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_or_create_notification_preferences(
  p_student_id UUID
)
RETURNS SETOF public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.notification_preferences
  WHERE student_id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY
    INSERT INTO public.notification_preferences (student_id)
    VALUES (p_student_id)
    RETURNING *;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_or_create_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_notification_preferences(UUID) TO service_role;

COMMIT;
