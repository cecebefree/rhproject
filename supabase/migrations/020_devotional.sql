-- Migration 020: Devotional schema
-- Spec ref: .swarm/spec.md line 36 — 020 = devotional
-- Locked decisions: spec sections 1 (Boundary B), 5 (soft-delete), 6 (RLS at S8)
--
-- Tables:
--   devotional_item   — daily devotional content (type + day keyed per tenant)
--   devotional_config — per-tenant branding + settings
--
-- NOTES:
--   - fn_current_devotional_day deferred: no anchor date in config yet.
--   - RLS deferred per spec line 28: "implement at S8" — not in this migration.
--   - set_updated_at() reused from 019 — not recreated here.
--   - Seed (Redhouse = tenant #1) deferred to supabase/seed.sql per spec line 45.
--   - 023 will NOT touch devotional tables (they are Boundary B, not LMS/Mobile).

BEGIN;

-- ─────────────────────────────────────────────
-- DEVOTIONAL CONFIG (per-tenant settings)
-- ─────────────────────────────────────────────
CREATE TABLE public.devotional_config (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES public.tenant_devotional(id),
    branding    jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active   boolean NOT NULL DEFAULT true,
    retention_until timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,

    CONSTRAINT devotional_config_tenant_id_unique UNIQUE (tenant_id)
);

COMMENT ON TABLE  public.devotional_config IS 'Per-tenant devotional configuration — branding and settings (Boundary B)';
COMMENT ON COLUMN public.devotional_config.tenant_id IS 'FK → tenant_devotional(id). One config row per devotional tenant.';
COMMENT ON COLUMN public.devotional_config.branding IS 'JSON branding config (logo, colors, iframe/Vimeo settings). Default empty object.';
COMMENT ON COLUMN public.devotional_config.is_active IS 'Soft-delete: false = deactivated, retained per retention_until';
COMMENT ON COLUMN public.devotional_config.retention_until IS 'Hard-delete safety window — row purged after this date by retention job';
COMMENT ON COLUMN public.devotional_config.deleted_at IS 'Soft-delete timestamp — set on deactivation, cleared on reactivation';

CREATE INDEX idx_devotional_config_tenant_id ON public.devotional_config (tenant_id);

-- ─────────────────────────────────────────────
-- DEVOTIONAL ITEM (daily content)
-- ─────────────────────────────────────────────
CREATE TABLE public.devotional_item (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES public.tenant_devotional(id),
    type        text NOT NULL,
    day         integer NOT NULL CHECK (day BETWEEN 1 AND 366),
    url_or_text text NOT NULL,
    is_iframe   boolean NOT NULL DEFAULT false,
    is_active   boolean NOT NULL DEFAULT true,
    retention_until timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz,

    CONSTRAINT devotional_item_tenant_type_day_unique UNIQUE (tenant_id, type, day)
);

COMMENT ON TABLE  public.devotional_item IS 'Daily devotional content entries per tenant (Boundary B)';
COMMENT ON COLUMN public.devotional_item.tenant_id IS 'FK → tenant_devotional(id). White-label boundary B.';
COMMENT ON COLUMN public.devotional_item.type IS 'Content category (e.g. "reading", "prayer", "reflection"). Scoped per tenant.';
COMMENT ON COLUMN public.devotional_item.day IS 'Day number within the devotional cycle. 1-365, unique per (tenant_id, type).';
COMMENT ON COLUMN public.devotional_item.url_or_text IS 'Content — either inline text or URL (iframe/Vimeo link).';
COMMENT ON COLUMN public.devotional_item.is_iframe IS 'true = url_or_text is an embed URL (iframe/Vimeo); false = inline text.';
COMMENT ON COLUMN public.devotional_item.is_active IS 'Soft-delete: false = deactivated, retained per retention_until';
COMMENT ON COLUMN public.devotional_item.retention_until IS 'Hard-delete safety window — row purged after this date by retention job';
COMMENT ON COLUMN public.devotional_item.deleted_at IS 'Soft-delete timestamp — set on deactivation, cleared on reactivation';

CREATE INDEX idx_devotional_item_tenant_id ON public.devotional_item (tenant_id);
CREATE INDEX idx_devotional_item_tenant_type ON public.devotional_item (tenant_id, type);
CREATE INDEX idx_devotional_item_deleted_at ON public.devotional_item (tenant_id) WHERE deleted_at IS NOT NULL;

-- fn_current_devotional_day deferred: no anchor date in config yet.

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGERS (reuse set_updated_at from 019)
-- ─────────────────────────────────────────────
CREATE TRIGGER trg_devotional_config_updated_at
    BEFORE UPDATE ON public.devotional_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_devotional_item_updated_at
    BEFORE UPDATE ON public.devotional_item
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- RLS: deferred to S8 per spec line 28
-- "Default-deny; claim-based via auth.jwt() -> app_metadata;
--  all policies reference tenant_id"
-- ─────────────────────────────────────────────

COMMIT;
