-- Migration 110: EF-to-EF rate limiting (Row 61)
-- Creates ef_call_log + rate_limit_config + check_rate_limit() function.
--
-- Strategy: per-caller + per-tenant. Each desk service has a default
-- calls_per_minute limit, overridable per-tenant via rate_limit_config.
-- check_rate_count() counts rows in ef_call_log for the last N seconds.
--
-- Integration: EF auth gate calls check_rate_limit() after HMAC verify,
-- before authorization matrix lookup. On exceeded: 429 + retry-after.
--
-- PREDECESSOR: 109

BEGIN;

-- ============================================================
-- 1. EF CALL LOG — immutable audit trail (from EF-to-EF auth design)
-- ============================================================
CREATE TABLE public.ef_call_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  caller        text NOT NULL,
  receiver      text NOT NULL,
  action        text NOT NULL,
  method        text NOT NULL,
  path          text NOT NULL,
  status_code   int NOT NULL,
  caller_ip     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ef_call_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ef_call_log IS 'Immutable audit log of EF-to-EF calls. Append-only. Used for rate limiting + compliance.';

-- Index for rate limit window queries (most recent 60s per caller+tenant)
CREATE INDEX idx_ef_call_log_rate_window
  ON public.ef_call_log (caller, tenant_id, created_at DESC);

-- RLS: admin-only SELECT within tenant (matches 086 pattern)
CREATE POLICY ef_call_log_admin_select ON public.ef_call_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Grants: service_role INSERT (EFs write via service_role), authenticated SELECT (admin dashboard)
GRANT INSERT ON public.ef_call_log TO service_role;
GRANT SELECT ON public.ef_call_log TO authenticated;

-- ============================================================
-- 2. RATE LIMIT CONFIG — per-service + per-tenant overrides
-- ============================================================
CREATE TABLE public.rate_limit_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_service  text NOT NULL,
  tenant_id       uuid,                          -- NULL = global default for this service
  calls_per_minute int NOT NULL DEFAULT 100,
  burst_allowed   boolean NOT NULL DEFAULT false, -- true = allow 2x burst for 10s window
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caller_service, tenant_id)
);

ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rate_limit_config IS 'Per-service rate limit configuration. NULL tenant_id = global default.';
COMMENT ON COLUMN public.rate_limit_config.burst_allowed IS 'When true, allows 2x calls_per_minute for a 10-second burst window.';

-- RLS: admin-all within tenant + global configs visible to all admins
CREATE POLICY rlc_admin_all ON public.rate_limit_config
  FOR ALL TO authenticated
  USING (
    (tenant_id IS NULL OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    (tenant_id IS NULL OR tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Grants
GRANT ALL ON public.rate_limit_config TO authenticated;

-- ============================================================
-- 3. SEED: global defaults for all three desk services
-- ============================================================
INSERT INTO public.rate_limit_config (caller_service, tenant_id, calls_per_minute, burst_allowed)
VALUES
  ('front_desk',  NULL, 100, true),
  ('school_desk', NULL, 100, true),
  ('office_desk', NULL, 100, true)
ON CONFLICT (caller_service, tenant_id) DO NOTHING;

-- ============================================================
-- 4. check_rate_limit() — returns true if under limit, false if exceeded
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_caller   text,
  p_tenant   uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_config       record;
  v_count        int;
  v_limit        int;
  v_window_sec   int := 60;
BEGIN
  -- Resolve config: tenant-specific override → global default
  SELECT calls_per_minute, burst_allowed, enabled
    INTO v_config
    FROM public.rate_limit_config
   WHERE caller_service = p_caller
     AND (tenant_id = p_tenant OR tenant_id IS NULL)
   ORDER BY tenant_id NULLS LAST  -- tenant-specific wins over global
   LIMIT 1;

  -- If no config found, allow (fail-open for first deploy)
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF NOT v_config.enabled THEN
    RETURN true;
  END IF;

  v_limit := v_config.calls_per_minute;

  -- Burst mode: 2x limit for 10-second window
  IF v_config.burst_allowed THEN
    -- Check if we're in a burst window (last 10s exceeded normal rate/6)
    SELECT count(*) INTO v_count
      FROM public.ef_call_log
     WHERE caller = p_caller
       AND tenant_id = p_tenant
       AND created_at > now() - interval '10 seconds';

    IF v_count >= (v_limit / 6) THEN
      -- Burst exhausted, fall back to normal 60s window
      v_window_sec := 60;
    ELSE
      -- Still in burst window
      v_window_sec := 10;
      v_limit := v_limit / 6;  -- 10s = 1/6 of minute
    END IF;
  END IF;

  -- Count calls in window
  SELECT count(*) INTO v_count
    FROM public.ef_call_log
   WHERE caller = p_caller
     AND tenant_id = p_tenant
     AND created_at > now() - (v_window_sec || ' seconds')::interval;

  RETURN v_count < v_limit;
END;
$function$;

COMMENT ON FUNCTION public.check_rate_limit(text, uuid) IS
  'Returns true if caller is under rate limit for tenant. Queries ef_call_log for last 60s (or 10s burst window).';

-- ============================================================
-- 5. get_rate_limit_info() — returns limit details for 429 response
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_rate_limit_info(
  p_caller   text,
  p_tenant   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_config     record;
  v_count      int;
  v_limit      int;
  v_retry_after int;
  v_window_sec int := 60;
BEGIN
  SELECT calls_per_minute, burst_allowed, enabled
    INTO v_config
    FROM public.rate_limit_config
   WHERE caller_service = p_caller
     AND (tenant_id = p_tenant OR tenant_id IS NULL)
   ORDER BY tenant_id NULLS LAST
   LIMIT 1;

  IF NOT FOUND OR NOT v_config.enabled THEN
    RETURN jsonb_build_object('limited', false);
  END IF;

  v_limit := v_config.calls_per_minute;

  -- Count in 60s window
  SELECT count(*) INTO v_count
    FROM public.ef_call_log
   WHERE caller = p_caller
     AND tenant_id = p_tenant
     AND created_at > now() - interval '60 seconds';

  v_retry_after := GREATEST(1, 60 - EXTRACT(epoch FROM (now() - (
    SELECT COALESCE(MAX(created_at), now() - interval '60 seconds')
      FROM public.ef_call_log
     WHERE caller = p_caller
       AND tenant_id = p_tenant
       AND created_at > now() - interval '60 seconds'
  )))::int);

  RETURN jsonb_build_object(
    'limited',       v_count >= v_limit,
    'limit',         v_limit,
    'window_sec',    60,
    'current_count', v_count,
    'retry_after',   v_retry_after
  );
END;
$function$;

COMMENT ON FUNCTION public.get_rate_limit_info(text, uuid) IS
  'Returns rate limit status as JSON for 429 response bodies.';

-- ============================================================
-- 6. updated_at trigger for rate_limit_config
-- ============================================================
CREATE TRIGGER trg_rate_limit_config_updated_at
  BEFORE UPDATE ON public.rate_limit_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
