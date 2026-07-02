-- Migration 019: Tenant Registries (3)
-- Spec ref: .swarm/spec.md line 35 — 019 = tenants (all 3 registries)
-- Locked decisions: spec sections 1, 2, 5, 6
--
-- Tables:
--   tenant_mobile      — has devotional_enabled toggle + devotional_tenant_id pointer
--   tenant_lms         — grouped LMS+Mobile; schedule_view_mode = 'combined'
--   tenant_devotional  — standalone; link-referenced (iframe/Vimeo)
--
-- NOTES:
--   - RLS deferred per spec line 28: "implement at S8" — not in this migration.
--   - Roles CHECK constraint deferred: spec line 23 says "on user table" — not in this migration.
--   - 023 will retrofit tenant_id onto LMS tables 013-018.
--   - Seed (Redhouse = tenant #1) deferred to supabase/seed.sql per spec line 45.

BEGIN;

-- ─────────────────────────────────────────────
-- TENANT DEVOTIONAL (standalone — no FK deps)
-- ─────────────────────────────────────────────
CREATE TABLE public.tenant_devotional (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    is_active   boolean NOT NULL DEFAULT true,
    retention_until timestamptz,
    deleted_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tenant_devotional IS 'Standalone devotional tenant registry — link-referenced (iframe/Vimeo)';
COMMENT ON COLUMN public.tenant_devotional.slug IS 'Unique slug — used in URLs and as tenant identifier';
COMMENT ON COLUMN public.tenant_devotional.is_active IS 'Soft-delete: false = deactivated, retained per retention_until';
COMMENT ON COLUMN public.tenant_devotional.retention_until IS 'Hard-delete safety window — row purged after this date by retention job';
COMMENT ON COLUMN public.tenant_devotional.deleted_at IS 'Soft-delete timestamp — set on deactivation, cleared on reactivation';

-- ─────────────────────────────────────────────
-- TENANT LMS (grouped LMS + Mobile)
-- ─────────────────────────────────────────────
CREATE TABLE public.tenant_lms (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    schedule_view_mode text NOT NULL DEFAULT 'combined'
        CHECK (schedule_view_mode IN ('combined', 'separate')),
    is_active   boolean NOT NULL DEFAULT true,
    retention_until timestamptz,
    deleted_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tenant_lms IS 'LMS + Mobile tenant registry — grouped owner_scope (Option A)';
COMMENT ON COLUMN public.tenant_lms.slug IS 'Unique slug — used in URLs and as tenant identifier';
COMMENT ON COLUMN public.tenant_lms.schedule_view_mode IS 'combined = single schedule view for LMS+Mobile; separate = split views';
COMMENT ON COLUMN public.tenant_lms.is_active IS 'Soft-delete: false = deactivated, retained per retention_until';
COMMENT ON COLUMN public.tenant_lms.retention_until IS 'Hard-delete safety window — row purged after this date by retention job';
COMMENT ON COLUMN public.tenant_lms.deleted_at IS 'Soft-delete timestamp — set on deactivation, cleared on reactivation';

-- ─────────────────────────────────────────────
-- TENANT MOBILE (has devotional pointer)
-- ─────────────────────────────────────────────
CREATE TABLE public.tenant_mobile (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    devotional_enabled boolean NOT NULL DEFAULT false,
    devotional_tenant_id uuid
        REFERENCES public.tenant_devotional(id) ON DELETE SET NULL,
    is_active   boolean NOT NULL DEFAULT true,
    retention_until timestamptz,
    deleted_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tenant_mobile IS 'Mobile tenant registry — grouped with LMS via owner_scope; devotional add-on pointer';
COMMENT ON COLUMN public.tenant_mobile.slug IS 'Unique slug — used in URLs and as tenant identifier';
COMMENT ON COLUMN public.tenant_mobile.devotional_enabled IS 'Toggle: true = devotional content active for this mobile tenant';
COMMENT ON COLUMN public.tenant_mobile.devotional_tenant_id IS 'FK to tenant_devotional — which devotional tenant supplies content';
COMMENT ON COLUMN public.tenant_mobile.is_active IS 'Soft-delete: false = deactivated, retained per retention_until';
COMMENT ON COLUMN public.tenant_mobile.retention_until IS 'Hard-delete safety window — row purged after this date by retention job';
COMMENT ON COLUMN public.tenant_mobile.deleted_at IS 'Soft-delete timestamp — set on deactivation, cleared on reactivation';

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenant_devotional_updated_at
    BEFORE UPDATE ON public.tenant_devotional
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tenant_lms_updated_at
    BEFORE UPDATE ON public.tenant_lms
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tenant_mobile_updated_at
    BEFORE UPDATE ON public.tenant_mobile
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
