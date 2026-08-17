-- Migration 145: Failed enrollment dead-letter table (Row 75)
-- Append-only audit log for failed registration + payment attempts

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- FAILED_ENROLLMENTS — dead-letter for Pattern A failures
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.failed_enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenant_lms(id),
  registration_attempt jsonb NOT NULL,
  payment_attempt      jsonb NOT NULL,
  error_code           text NOT NULL,
  error_message        text NOT NULL,
  payment_provider     text CHECK (payment_provider IN ('stripe', 'paypal')),
  payment_reference    text,
  ip_address           text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  resolved             boolean NOT NULL DEFAULT false,
  resolved_at          timestamptz,
  resolved_by          uuid REFERENCES auth.users(id),
  resolution_notes     text
);

CREATE INDEX IF NOT EXISTS idx_failed_enrollments_tenant
  ON office_desk.failed_enrollments (tenant_id);

CREATE INDEX IF NOT EXISTS idx_failed_enrollments_created
  ON office_desk.failed_enrollments (created_at);

CREATE INDEX IF NOT EXISTS idx_failed_enrollments_unresolved
  ON office_desk.failed_enrollments (resolved)
  WHERE resolved = false;

-- ═══════════════════════════════════════════════════════════
-- RLS: FAILED_ENROLLMENTS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.failed_enrollments ENABLE ROW LEVEL SECURITY;

-- Deny anon — dead-letter is internal only
DROP POLICY IF EXISTS fe_deny_anon ON office_desk.failed_enrollments;
CREATE POLICY fe_deny_anon ON office_desk.failed_enrollments
  FOR ALL TO anon
  USING (false);

-- Deny authenticated — only service_role + office can read
DROP POLICY IF EXISTS fe_deny_authenticated ON office_desk.failed_enrollments;
CREATE POLICY fe_deny_authenticated ON office_desk.failed_enrollments
  FOR ALL TO authenticated
  USING (false);

-- Office/admin read-only for investigation
DROP POLICY IF EXISTS fe_office_select ON office_desk.failed_enrollments;
CREATE POLICY fe_office_select ON office_desk.failed_enrollments
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT SELECT ON office_desk.failed_enrollments TO authenticated;
GRANT ALL ON office_desk.failed_enrollments TO service_role;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE office_desk.failed_enrollments IS 'Row 75: Append-only dead-letter for failed Pattern A registration + payment attempts';
COMMENT ON COLUMN office_desk.failed_enrollments.registration_attempt IS 'Sanitized registration form data (jsonb)';
COMMENT ON COLUMN office_desk.failed_enrollments.payment_attempt IS 'Sanitized payment data (jsonb, tokens redacted)';
COMMENT ON COLUMN office_desk.failed_enrollments.error_code IS 'Machine-readable error: VALIDATION_ERROR, PAYMENT_FAILED, DB_ERROR, DUPLICATE_EMAIL, TENANT_NOT_FOUND';
COMMENT ON COLUMN office_desk.failed_enrollments.resolved IS 'False until manual review resolves the failure';

COMMIT;
