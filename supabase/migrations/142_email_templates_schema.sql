-- Migration 141: Email Templates
-- Creates email_templates, email_template_usage tables with RLS policies

-- ═══════════════════════════════════════════════════════════
-- EMAIL TEMPLATES TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for tenant isolation
CREATE INDEX idx_email_templates_tenant_id ON office_desk.email_templates(tenant_id);
CREATE INDEX idx_email_templates_active ON office_desk.email_templates(tenant_id, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_templates_created_at ON office_desk.email_templates(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- EMAIL TEMPLATE USAGE TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.email_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES office_desk.email_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  contact_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  variables_used JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for email_template_usage
CREATE INDEX idx_email_template_usage_template_id ON office_desk.email_template_usage(template_id);
CREATE INDEX idx_email_template_usage_tenant_id ON office_desk.email_template_usage(tenant_id);
CREATE INDEX idx_email_template_usage_contact_id ON office_desk.email_template_usage(contact_id);
CREATE INDEX idx_email_template_usage_sent_at ON office_desk.email_template_usage(sent_at DESC);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_email_template_updated_at
  BEFORE UPDATE ON office_desk.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_email_template_timestamp();

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.email_template_usage ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on email_templates
CREATE POLICY email_templates_admin_all ON office_desk.email_templates
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk role can manage email_templates
CREATE POLICY email_templates_office_desk_manage ON office_desk.email_templates
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage email_templates (for backend operations)
CREATE POLICY email_templates_service_role ON office_desk.email_templates
  FOR ALL
  USING (true);

-- Admin can view email_template_usage
CREATE POLICY email_template_usage_admin_select ON office_desk.email_template_usage
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk role can view email_template_usage
CREATE POLICY email_template_usage_office_desk_select ON office_desk.email_template_usage
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage email_template_usage (for backend operations)
CREATE POLICY email_template_usage_service_role ON office_desk.email_template_usage
  FOR ALL
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

-- Grant usage on schema
GRANT USAGE ON SCHEMA office_desk TO authenticated;
GRANT USAGE ON SCHEMA office_desk TO service_role;

-- Grant table access
GRANT ALL ON office_desk.email_templates TO authenticated;
GRANT ALL ON office_desk.email_template_usage TO authenticated;
GRANT ALL ON office_desk.email_templates TO service_role;
GRANT ALL ON office_desk.email_template_usage TO service_role;

-- Grant sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA office_desk TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA office_desk TO service_role;
