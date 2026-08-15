-- Migration 144: Create ef_call_log table for EF-to-EF auth audit trail
-- Append-only audit log for inter-EF calls with HMAC-SHA256 verification

-- ═══════════════════════════════════════════════════════════
-- TABLE: ef_call_log
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ef_call_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  caller TEXT NOT NULL,
  receiver TEXT NOT NULL,
  action TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INT NOT NULL,
  caller_ip TEXT,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  replay_check_passed BOOLEAN NOT NULL DEFAULT false,
  request_hash TEXT,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

-- Index on created_at for time-range queries
CREATE INDEX IF NOT EXISTS idx_ef_call_log_created_at
  ON public.ef_call_log (created_at DESC);

-- Index on caller for per-caller rate limiting
CREATE INDEX IF NOT EXISTS idx_ef_call_log_caller
  ON public.ef_call_log (caller, created_at DESC);

-- Index on tenant_id for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_ef_call_log_tenant_id
  ON public.ef_call_log (tenant_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.ef_call_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert (for EF audit logging)
CREATE POLICY "ef_call_log_insert_service_role"
  ON public.ef_call_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admin users can read within their tenant
CREATE POLICY "ef_call_log_select_admin"
  ON public.ef_call_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.tenant_id = ef_call_log.tenant_id
    )
  );

-- No UPDATE or DELETE allowed (append-only)
-- RLS defaults to DENY for UPDATE/DELETE

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

-- Service role can insert (for EF audit logging)
GRANT INSERT ON public.ef_call_log TO service_role;

-- Authenticated users can read (filtered by RLS)
GRANT SELECT ON public.ef_call_log TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE public.ef_call_log IS 'Append-only audit log for EF-to-EF calls with HMAC-SHA256 verification';
COMMENT ON COLUMN public.ef_call_log.caller IS 'Name of the calling EF service (e.g., front_desk, school_desk)';
COMMENT ON COLUMN public.ef_call_log.receiver IS 'Name of the receiving EF service';
COMMENT ON COLUMN public.ef_call_log.action IS 'Action being performed (e.g., create_enrollment)';
COMMENT ON COLUMN public.ef_call_log.signature_valid IS 'Whether HMAC-SHA256 signature was valid';
COMMENT ON COLUMN public.ef_call_log.replay_check_passed IS 'Whether timestamp replay check passed (< 60s old)';
COMMENT ON COLUMN public.ef_call_log.request_hash IS 'SHA256 hash of the request body';
COMMENT ON COLUMN public.ef_call_log.error_msg IS 'Error message if call failed';
