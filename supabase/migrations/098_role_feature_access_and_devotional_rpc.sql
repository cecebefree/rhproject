-- 098_role_feature_access_and_devotional_rpc.sql
-- Adds role_feature_access table for per-role tile visibility rules.
-- Replaces get_today_devotional RPC to query all four devotional tables
-- filtered by role via role_feature_access join.
--
-- Does NOT modify devotional_item, devotional_config, daily_verse,
-- bible_plan, video_of_day, or vlog table structures or RLS policies.

BEGIN;

-- ─────────────────────────────────────────────
-- 1. ROLE_FEATURE_ACCESS table
-- ─────────────────────────────────────────────
CREATE TABLE public.role_feature_access (
    role          text NOT NULL,
    feature_area  text NOT NULL,
    tile_name     text NOT NULL,
    is_visible    boolean NOT NULL DEFAULT true,
    PRIMARY KEY (role, feature_area, tile_name)
);

ALTER TABLE public.role_feature_access ENABLE ROW LEVEL SECURITY;

-- Admin-all: full CRUD for admins
DROP POLICY IF EXISTS rfa_admin_all ON public.role_feature_access;
CREATE POLICY rfa_admin_all ON public.role_feature_access
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- Authenticated read: any authenticated user can SELECT (needed for
-- SECURITY DEFINER RPCs that run as the caller and need to read rules)
DROP POLICY IF EXISTS rfa_authenticated_read ON public.role_feature_access;
CREATE POLICY rfa_authenticated_read ON public.role_feature_access
    FOR SELECT TO authenticated
    USING (true);

COMMENT ON TABLE  public.role_feature_access IS 'Per-role tile visibility rules for feature areas (devotional, etc.)';
COMMENT ON COLUMN public.role_feature_access.role IS 'User role: student, teacher, family, admin, office';
COMMENT ON COLUMN public.role_feature_access.feature_area IS 'Feature area: e.g. devotional, channels';
COMMENT ON COLUMN public.role_feature_access.tile_name IS 'Tile name within feature area: e.g. verse, music, bible_365, vlog';
COMMENT ON COLUMN public.role_feature_access.is_visible IS 'true = tile visible for this role; false = hidden (server-side filtered)';

-- ─────────────────────────────────────────────
-- 2. SEED: devotional rules (12 rows)
-- ─────────────────────────────────────────────
INSERT INTO public.role_feature_access (role, feature_area, tile_name, is_visible) VALUES
  ('student', 'devotional', 'verse',      true),
  ('student', 'devotional', 'music',      true),
  ('student', 'devotional', 'bible_365',  true),
  ('student', 'devotional', 'vlog',       true),
  ('teacher', 'devotional', 'verse',      true),
  ('teacher', 'devotional', 'music',      false),
  ('teacher', 'devotional', 'bible_365',  false),
  ('teacher', 'devotional', 'vlog',       false),
  ('family',  'devotional', 'verse',      true),
  ('family',  'devotional', 'music',      false),
  ('family',  'devotional', 'bible_365',  false),
  ('family',  'devotional', 'vlog',       false)
ON CONFLICT (role, feature_area, tile_name) DO UPDATE SET is_visible = EXCLUDED.is_visible;

-- ─────────────────────────────────────────────
-- 3. REPLACE get_today_devotional RPC
--    Returns rows from daily_verse, bible_plan,
--    video_of_day, vlog — filtered by caller's
--    role via role_feature_access.
-- ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_today_devotional();

CREATE OR REPLACE FUNCTION public.get_today_devotional()
RETURNS TABLE (
  tile    text,
  ref     text,
  content text,
  title   text,
  day     int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH caller AS (
    SELECT
      (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid AS tenant_id,
      (auth.jwt() -> 'app_metadata' ->> 'role')::text      AS role
  ),
  visible_tiles AS (
    SELECT rfa.tile_name
    FROM public.role_feature_access rfa
    WHERE rfa.feature_area = 'devotional'
      AND rfa.role = (SELECT role FROM caller)
      AND rfa.is_visible = true
  )
  -- daily_verse (tile: verse)
  SELECT
    'verse'::text                                      AS tile,
    dv.verse_reference                                 AS ref,
    dv.verse_text                                      AS content,
    dv.translation_name                                AS title,
    NULL::int                                          AS day
  FROM public.daily_verse dv, caller c
  WHERE 'verse' IN (SELECT tile_name FROM visible_tiles)
    AND dv.tenant_id = c.tenant_id
    AND dv.verse_date = current_date
    AND dv.is_active = true
    AND dv.deleted_at IS NULL

  UNION ALL

  -- bible_plan (tile: bible_365)
  SELECT
    'bible_365'::text                                  AS tile,
    bp.chapters                                        AS ref,
    NULL::text                                         AS content,
    bp.translation_name                                AS title,
    bp.day_n                                           AS day
  FROM public.bible_plan bp, caller c
  WHERE 'bible_365' IN (SELECT tile_name FROM visible_tiles)
    AND bp.tenant_id = c.tenant_id
    AND bp.day_n = (extract(doy from current_date)::int % 365) + 1
    AND bp.is_active = true
    AND bp.deleted_at IS NULL

  UNION ALL

  -- video_of_day (tile: music)
  SELECT
    'music'::text                                      AS tile,
    vod.youtube_video_id                               AS ref,
    NULL::text                                         AS content,
    vod.title                                          AS title,
    NULL::int                                          AS day
  FROM public.video_of_day vod, caller c
  WHERE 'music' IN (SELECT tile_name FROM visible_tiles)
    AND vod.tenant_id = c.tenant_id
    AND vod.video_date = current_date
    AND vod.is_active = true
    AND vod.deleted_at IS NULL

  UNION ALL

  -- vlog (tile: vlog)
  SELECT
    'vlog'::text                                       AS tile,
    vl.video_ref                                       AS ref,
    NULL::text                                         AS content,
    vl.title                                           AS title,
    NULL::int                                          AS day
  FROM public.vlog vl, caller c
  WHERE 'vlog' IN (SELECT tile_name FROM visible_tiles)
    AND vl.tenant_id = c.tenant_id
    AND vl.vlog_date = current_date
    AND vl.is_active = true
    AND vl.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_devotional() TO authenticated;

COMMENT ON FUNCTION public.get_today_devotional() IS
  'SECURITY DEFINER: returns today devotional content across four tables (daily_verse, bible_plan, video_of_day, vlog), filtered by caller role via role_feature_access. Tenant-scoped via JWT app_metadata.';

COMMIT;
