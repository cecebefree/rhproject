-- seed.sql — Schema-only seed: tenants + terms.
-- Auth users → scripts/seed-users.sh (Admin API).
-- User-dependent data (courses, enrolments, etc.) → scripts/seed-users.sh.
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING.
-- FK order: devotional BEFORE mobile (mobile FKs to devotional).

BEGIN;

-- ─────────────────────────────────────────────
-- 1. TENANT REDHOUSE (Tenant #1 across all registries)
-- ─────────────────────────────────────────────

INSERT INTO public.tenant_mobile (id, name, slug, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_lms (id, name, slug, is_active, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', true, now())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. TENANT #2 (cross-tenant isolation tests)
-- ─────────────────────────────────────────────

INSERT INTO public.tenant_devotional (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Second Devotional', 'second-devotional', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_lms (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Second Tenant', 'second', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_mobile (id, name, slug, devotional_enabled, devotional_tenant_id, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Second Tenant', 'second', true,
        '00000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. TERMS (no user deps — tenant + date only)
-- ─────────────────────────────────────────────

INSERT INTO public.terms (id, tenant_id, name, start_date, end_date)
VALUES
  ('cccc0000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-000000000001',
   '2024-25 Academic Year',
   (now() - interval '1 day')::date,
   (now() + interval '300 days')::date)
ON CONFLICT (id) DO NOTHING;

COMMIT;
