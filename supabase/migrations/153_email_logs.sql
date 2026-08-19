-- Migration 153: Email logs + send-template-email support (Row 103)
-- Creates: public.email_logs for tracking all outgoing LMS emails

CREATE TABLE IF NOT EXISTS public.email_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  template_id     text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name  text,
  subject         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'rate_limited')),
  provider_message_id text,
  error_message   text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.email_logs.template_id IS 'Template identifier: registration_approved, grade_posted, etc.';
COMMENT ON COLUMN public.email_logs.provider_message_id IS 'SendGrid message ID for tracking';
COMMENT ON COLUMN public.email_logs.metadata IS 'Dynamic template data sent with the email';

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON public.email_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs (template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs (created_at DESC);

-- Rate limiting: count emails per tenant per hour
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_hour
  ON public.email_logs (tenant_id, created_at DESC)
  WHERE status = 'sent';

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Service role (EFs) can do everything
CREATE POLICY email_logs_service_role ON public.email_logs
  FOR ALL USING (true);

-- Admin/office can read email logs
CREATE POLICY email_logs_admin_select ON public.email_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'office')
  );

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

GRANT ALL ON public.email_logs TO service_role;
GRANT SELECT ON public.email_logs TO authenticated;
