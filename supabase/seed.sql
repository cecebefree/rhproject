-- seed.sql — Redhouse = Tenant #1 across all 3 registries
-- Source: spec.md §11 (Seed Strategy)
-- CTO verdict: Option A — same UUID across all registries
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING
-- FK order: devotional BEFORE mobile (mobile FKs to devotional)

BEGIN;

-- ─────────────────────────────────────────────
-- 1. TENANT DEVOTIONAL (standalone — no FK deps)
-- ─────────────────────────────────────────────
INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Redhouse Devotional',
    'redhouse-devotional',
    true,
    now(),
    now()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. TENANT LMS (grouped LMS + Mobile)
-- ─────────────────────────────────────────────
INSERT INTO public.tenant_lms (id, name, slug, schedule_view_mode, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Redhouse',
    'redhouse',
    'combined',
    true,
    now(),
    now()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. TENANT MOBILE (has devotional pointer)
-- ─────────────────────────────────────────────
INSERT INTO public.tenant_mobile (id, name, slug, devotional_enabled, devotional_tenant_id, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Redhouse',
    'redhouse',
    true,
    '00000000-0000-0000-0000-000000000001'::uuid,
    true,
    now(),
    now()
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
