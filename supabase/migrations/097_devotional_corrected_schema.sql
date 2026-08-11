-- 090_devotional_corrected_schema.sql
-- CORRECTED MVP devotional schema: four purpose-built tables replacing
-- the generic devotional_item approach.
--
-- Tables:
--   daily_verse   — date-keyed Bible verse, resets at local 00:00
--   bible_plan    — 365-day reading plan, day_n fixed 1-365, resets yearly
--   video_of_day  — single YouTube video per day (Music section)
--   vlog          — daily OTT vlog, Vimeo-hosted
--
-- NOTE: devotional_item and devotional_config are NOT dropped.
-- They remain for backward compatibility until a future migration retires them.
--
-- RLS: admin-all pattern matching devotional_config/devotional_item (086).
-- Non-admin reads go through SECURITY DEFINER RPCs (not direct table access).
-- Grants: 069 default-privilege sweep already stripped anon/authenticated
-- TRUNCATE/TRIGGER/REFERENCES/MAINTAIN; no additional REVOKE needed here.

BEGIN;

-- ─────────────────────────────────────────────
-- 1. DAILY VERSE (date-keyed, one per calendar date per tenant)
-- ─────────────────────────────────────────────
CREATE TABLE public.daily_verse (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenant_devotional(id),
    verse_date        date NOT NULL,
    verse_text        text NOT NULL,
    verse_reference   text NOT NULL,                -- e.g. "John 10:10"
    translation_name  text NOT NULL DEFAULT 'The Passion Translation',
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,

    CONSTRAINT daily_verse_tenant_date_unique UNIQUE (tenant_id, verse_date)
);

CREATE INDEX idx_daily_verse_tenant_id ON public.daily_verse (tenant_id);
CREATE INDEX idx_daily_verse_date ON public.daily_verse (verse_date);

COMMENT ON TABLE  public.daily_verse IS 'Date-keyed daily Bible verse per tenant — resets at local 00:00, content pre-programmed';
COMMENT ON COLUMN public.daily_verse.verse_date IS 'Calendar date for this verse. One verse per (tenant_id, verse_date).';
COMMENT ON COLUMN public.daily_verse.verse_reference IS 'Citation, e.g. "John 10:10"';
COMMENT ON COLUMN public.daily_verse.translation_name IS 'Translation name, e.g. "The Passion Translation". Default TPT for MVP.';

CREATE TRIGGER trg_daily_verse_updated_at
    BEFORE UPDATE ON public.daily_verse
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 2. BIBLE PLAN (365-day reading, day_n fixed, resets yearly)
-- ─────────────────────────────────────────────
CREATE TABLE public.bible_plan (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenant_devotional(id),
    day_n             integer NOT NULL CHECK (day_n BETWEEN 1 AND 365),
    chapters          text NOT NULL,                 -- e.g. "Genesis 1-4"
    translation_name  text NOT NULL DEFAULT 'English Standard Version',
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,

    CONSTRAINT bible_plan_tenant_day_unique UNIQUE (tenant_id, day_n)
);

CREATE INDEX idx_bible_plan_tenant_id ON public.bible_plan (tenant_id);

COMMENT ON TABLE  public.bible_plan IS '365-day Bible reading plan per tenant — day_n is fixed, resets yearly independent of calendar date';
COMMENT ON COLUMN public.bible_plan.day_n IS 'Day number 1-365 within the reading plan. Fixed; does not shift with calendar.';
COMMENT ON COLUMN public.bible_plan.chapters IS 'Reading assignment, e.g. "Genesis 1-4"';
COMMENT ON COLUMN public.bible_plan.translation_name IS 'Translation for this entry. Single column MVP — no separate translation join table.';

CREATE TRIGGER trg_bible_plan_updated_at
    BEFORE UPDATE ON public.bible_plan
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3. VIDEO OF DAY (single YouTube video per day — Music section)
-- ─────────────────────────────────────────────
CREATE TABLE public.video_of_day (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenant_devotional(id),
    video_date        date NOT NULL,
    youtube_video_id  text NOT NULL,                 -- YouTube video ID for in-app playback
    title             text,                          -- optional display title
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,

    CONSTRAINT video_of_day_tenant_date_unique UNIQUE (tenant_id, video_date)
);

CREATE INDEX idx_video_of_day_tenant_id ON public.video_of_day (tenant_id);
CREATE INDEX idx_video_of_day_date ON public.video_of_day (video_date);

COMMENT ON TABLE  public.video_of_day IS 'Single video-of-the-day per tenant — Music section entry point. MVP: no chart/ranking, no Spotify.';
COMMENT ON COLUMN public.video_of_day.youtube_video_id IS 'YouTube video ID for in-app playback (e.g. "dQw4w9WgXcQ")';
COMMENT ON COLUMN public.video_of_day.title IS 'Optional display title for the video';

CREATE TRIGGER trg_video_of_day_updated_at
    BEFORE UPDATE ON public.video_of_day
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. VLOG (daily OTT video, Vimeo-hosted)
-- ─────────────────────────────────────────────
CREATE TABLE public.vlog (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES public.tenant_devotional(id),
    vlog_date         date NOT NULL,
    video_ref         text NOT NULL,                 -- Vimeo URL
    title             text NOT NULL,                 -- required display title
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,

    CONSTRAINT vlog_tenant_date_unique UNIQUE (tenant_id, vlog_date)
);

CREATE INDEX idx_vlog_tenant_id ON public.vlog (tenant_id);
CREATE INDEX idx_vlog_date ON public.vlog (vlog_date);

COMMENT ON TABLE  public.vlog IS 'Daily OTT vlog per tenant — student-produced, Vimeo-hosted, rotates at local 00:00';
COMMENT ON COLUMN public.vlog.video_ref IS 'Vimeo URL for the vlog video';
COMMENT ON COLUMN public.vlog.title IS 'Display title for the vlog entry';

CREATE TRIGGER trg_vlog_updated_at
    BEFORE UPDATE ON public.vlog
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 5. RLS — admin-all on each new table
-- Matches devotional_config/devotional_item pattern (086).
-- Non-admin access is via SECURITY DEFINER RPCs only.
-- ─────────────────────────────────────────────

-- daily_verse
ALTER TABLE public.daily_verse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dv_admin_all ON public.daily_verse;
CREATE POLICY dv_admin_all ON public.daily_verse
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS dv_tenant_read ON public.daily_verse;
CREATE POLICY dv_tenant_read ON public.daily_verse
    FOR SELECT TO authenticated
    USING (tenant_id = ((public.jwt_tenant_id()))::uuid
           AND is_active = true
           AND deleted_at IS NULL);

-- bible_plan
ALTER TABLE public.bible_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bp_admin_all ON public.bible_plan;
CREATE POLICY bp_admin_all ON public.bible_plan
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS bp_tenant_read ON public.bible_plan;
CREATE POLICY bp_tenant_read ON public.bible_plan
    FOR SELECT TO authenticated
    USING (tenant_id = ((public.jwt_tenant_id()))::uuid
           AND is_active = true
           AND deleted_at IS NULL);

-- video_of_day
ALTER TABLE public.video_of_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vd_admin_all ON public.video_of_day;
CREATE POLICY vd_admin_all ON public.video_of_day
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS vd_tenant_read ON public.video_of_day;
CREATE POLICY vd_tenant_read ON public.video_of_day
    FOR SELECT TO authenticated
    USING (tenant_id = ((public.jwt_tenant_id()))::uuid
           AND is_active = true
           AND deleted_at IS NULL);

-- vlog
ALTER TABLE public.vlog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vl_admin_all ON public.vlog;
CREATE POLICY vl_admin_all ON public.vlog
    TO authenticated
    USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
    WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS vl_tenant_read ON public.vlog;
CREATE POLICY vl_tenant_read ON public.vlog
    FOR SELECT TO authenticated
    USING (tenant_id = ((public.jwt_tenant_id()))::uuid
           AND is_active = true
           AND deleted_at IS NULL);

COMMIT;
