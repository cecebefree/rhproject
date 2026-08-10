-- 099_content_group.sql
-- Layer 2: content-group differentiation on top of Layer 1 role-based
-- access from 098. Adds a free-text content_group column to the four
-- devotional tables and profiles, with server-side filtering in both
-- RLS policies and the get_today_devotional RPC.
--
-- Does NOT modify role_feature_access or anything from migration 098.
-- Does NOT add CHECK constraints or enum types on content_group.
-- Does NOT author any junior or pre-school content rows.
--
-- Accepted future values for Redhouse (documentation only, NOT enforced):
--   'senior', 'junior', 'pre-school', 'all'
--
-- REDHOUSE CONTENT-AUTHORING RULE (enforced by convention, not DB):
--   'all' must NEVER be used as content_group on actual content rows
--   in daily_verse, bible_plan, video_of_day, or vlog. The column-level
--   DEFAULT 'all' remains in the schema for white-label flexibility, but
--   Redhouse content authors must always explicitly tag rows as 'junior'
--   or 'senior'. When content applies to both groups, duplicate the row
--   (one with content_group = 'junior', one with content_group = 'senior').
--
-- PROFILES SCOPED UPDATE (hosted role count: admin:1, family:2,
--   outside_student:1, student:2, teacher:2):
--   - student/outside_student → 'senior' (only Senior has live users at MVP)
--   - teacher/family/admin → remain at column default 'all' (see both groups)

BEGIN;

-- ─────────────────────────────────────────────
-- 1. ADD content_group column to four devotional tables
-- ─────────────────────────────────────────────

ALTER TABLE public.daily_verse
  ADD COLUMN IF NOT EXISTS content_group text NOT NULL DEFAULT 'all';

ALTER TABLE public.bible_plan
  ADD COLUMN IF NOT EXISTS content_group text NOT NULL DEFAULT 'all';

ALTER TABLE public.video_of_day
  ADD COLUMN IF NOT EXISTS content_group text NOT NULL DEFAULT 'all';

ALTER TABLE public.vlog
  ADD COLUMN IF NOT EXISTS content_group text NOT NULL DEFAULT 'all';

-- ─────────────────────────────────────────────
-- 2. ADD content_group column to profiles
--    DEFAULT 'all' — teacher/family/admin stay here
-- ─────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS content_group text NOT NULL DEFAULT 'all';

-- ─────────────────────────────────────────────
-- 3. DEFAULT DATA VALUES
--
--    All four devotional tables are empty on hosted.
--    No UPDATE needed. When content is loaded, it must be
--    explicitly tagged 'junior' or 'senior' per the
--    Redhouse content-authoring rule above — never 'all'.
--
--    Profiles: scoped UPDATE — only student/outside_student
--    are set to 'senior'. teacher/family/admin remain at
--    column default 'all' (see both junior and senior content).
-- ─────────────────────────────────────────────

-- profiles: only student/outside_student → 'senior'
-- teacher, family, admin stay at column default 'all'
UPDATE public.profiles
   SET content_group = 'senior'
 WHERE role IN ('student', 'outside_student')
   AND content_group IS DISTINCT FROM 'senior';

-- ─────────────────────────────────────────────
-- 4. COLUMN COMMENTS (documentation, not enforced)
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.daily_verse.content_group IS
  'Free-text content group tag. Accepted Redhouse values: senior, junior. REDHOUSE RULE: never use all on content rows — duplicate the row instead. Column DEFAULT all is for white-label flexibility only.';

COMMENT ON COLUMN public.bible_plan.content_group IS
  'Free-text content group tag. Accepted Redhouse values: senior, junior. REDHOUSE RULE: never use all on content rows — duplicate the row instead. Column DEFAULT all is for white-label flexibility only.';

COMMENT ON COLUMN public.video_of_day.content_group IS
  'Free-text content group tag. Accepted Redhouse values: senior, junior. REDHOUSE RULE: never use all on content rows — duplicate the row instead. Column DEFAULT all is for white-label flexibility only.';

COMMENT ON COLUMN public.vlog.content_group IS
  'Free-text content group tag. Accepted Redhouse values: senior, junior. REDHOUSE RULE: never use all on content rows — duplicate the row instead. Column DEFAULT all is for white-label flexibility only.';

COMMENT ON COLUMN public.profiles.content_group IS
  'Content group this user belongs to. student/outside_student roles are scoped to senior at Redhouse MVP; teacher, family, and admin default to all and see both junior and senior content. Not enforced at DB level.';

-- ─────────────────────────────────────────────
-- 5. UPDATE RLS — tenant_read policies on four tables
--    Add content_group check alongside existing
--    tenant_id / is_active / deleted_at conditions.
-- ─────────────────────────────────────────────

-- Helper function: get caller's content_group from profiles
CREATE OR REPLACE FUNCTION public.jwt_content_group()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.content_group
       FROM public.profiles p
      WHERE p.id = auth.uid()),
    'all'
  );
$$;

COMMENT ON FUNCTION public.jwt_content_group() IS
  'Returns the caller''s content_group from their profiles row. Falls back to ''all'' if no profile found.';

-- daily_verse: replace tenant_read with content_group-aware version
DROP POLICY IF EXISTS dv_tenant_read ON public.daily_verse;
CREATE POLICY dv_tenant_read ON public.daily_verse
    FOR SELECT TO authenticated
    USING (tenant_id = public.jwt_tenant_id()::uuid
           AND is_active = true
           AND deleted_at IS NULL
           AND (content_group = 'all'
                OR content_group = public.jwt_content_group()));

-- bible_plan: replace tenant_read
DROP POLICY IF EXISTS bp_tenant_read ON public.bible_plan;
CREATE POLICY bp_tenant_read ON public.bible_plan
    FOR SELECT TO authenticated
    USING (tenant_id = public.jwt_tenant_id()::uuid
           AND is_active = true
           AND deleted_at IS NULL
           AND (content_group = 'all'
                OR content_group = public.jwt_content_group()));

-- video_of_day: replace tenant_read
DROP POLICY IF EXISTS vd_tenant_read ON public.video_of_day;
CREATE POLICY vd_tenant_read ON public.video_of_day
    FOR SELECT TO authenticated
    USING (tenant_id = public.jwt_tenant_id()::uuid
           AND is_active = true
           AND deleted_at IS NULL
           AND (content_group = 'all'
                OR content_group = public.jwt_content_group()));

-- vlog: replace tenant_read
DROP POLICY IF EXISTS vl_tenant_read ON public.vlog;
CREATE POLICY vl_tenant_read ON public.vlog
    FOR SELECT TO authenticated
    USING (tenant_id = public.jwt_tenant_id()::uuid
           AND is_active = true
           AND deleted_at IS NULL
           AND (content_group = 'all'
                OR content_group = public.jwt_content_group()));

-- ─────────────────────────────────────────────
-- 6. REPLACE get_today_devotional RPC
--    Adds content_group filtering server-side.
--    Caller must have matching profile content_group
--    or content_group = 'all'.
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
      (auth.jwt() -> 'app_metadata' ->> 'role')::text      AS role,
      public.jwt_content_group()                            AS content_group
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
    AND (dv.content_group = 'all' OR dv.content_group = c.content_group)

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
    AND (bp.content_group = 'all' OR bp.content_group = c.content_group)

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
    AND (vod.content_group = 'all' OR vod.content_group = c.content_group)

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
    AND vl.deleted_at IS NULL
    AND (vl.content_group = 'all' OR vl.content_group = c.content_group);
$$;

GRANT EXECUTE ON FUNCTION public.get_today_devotional() TO authenticated;

COMMENT ON FUNCTION public.get_today_devotional() IS
  'SECURITY DEFINER: returns today devotional content across four tables, filtered by caller role (role_feature_access) AND content_group (profiles). Tenant-scoped via JWT.';

COMMIT;
