-- Migration 024: backfill profiles.tenant_id + enable RLS on 5 tables
-- Handoff ref: .swarm/deferred.md line 71-72
-- Inserts Redhouse tenant_devotional row if missing (seed runs after migrations).
-- DO-block: RAISE EXCEPTION if Redhouse tenant UUID is NULL (fail-loud).
-- Then enable RLS on devotional_config, devotional_item, tenant_devotional,
-- tenant_lms, tenant_mobile — all with admin_all bypass.
-- profiles RLS already enabled in 013; self-read = direct id = auth.uid() (no recursion).

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. ENSURE Redhouse tenant_devotional exists
--    (seed runs AFTER migrations — must insert here for backfill)
-- ═══════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════
-- 2. BACKFILL: profiles.tenant_id -> Redhouse
-- ═══════════════════════════════════════════════
DO $$
DECLARE
  _redhouse_id uuid;
BEGIN
  SELECT id INTO _redhouse_id
    FROM public.tenant_devotional
   WHERE slug = 'redhouse-devotional'
   LIMIT 1;

  IF _redhouse_id IS NULL THEN
    RAISE EXCEPTION '024 BACKFATAL: Redhouse tenant_devotional row not found (slug=redhouse-devotional).';
  END IF;

  UPDATE public.profiles
     SET tenant_id = _redhouse_id
   WHERE tenant_id IS NULL;
END;
$$;

-- ═══════════════════════════════════════════════
-- 3. RLS: Enable on 5 tables + admin_all bypass
-- ═══════════════════════════════════════════════

-- ── tenant_devotional ──
ALTER TABLE public.tenant_devotional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_tenant_devotional" ON public.tenant_devotional
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- ── tenant_lms ──
ALTER TABLE public.tenant_lms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_tenant_lms" ON public.tenant_lms
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- ── tenant_mobile ──
ALTER TABLE public.tenant_mobile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_tenant_mobile" ON public.tenant_mobile
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- ── devotional_config ──
ALTER TABLE public.devotional_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_devotional_config" ON public.devotional_config
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

-- ── devotional_item ──
ALTER TABLE public.devotional_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_devotional_item" ON public.devotional_item
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

COMMIT;
