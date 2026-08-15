-- Row 12: Export & Reporting schema
-- scheduled_reports, report_templates, report_logs tables with RLS

-- ═══════════════════════════════════════════════════════════
-- REPORT TEMPLATES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE office_desk.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('summary', 'detailed', 'custom')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'leads', 'invoices', 'all')),
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_by TEXT NOT NULL DEFAULT 'created_at',
  sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  group_by TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE office_desk.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their desk"
  ON office_desk.report_templates
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Users with settings.manage can manage templates"
  ON office_desk.report_templates
  FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM office_desk.user_desk_roles udr
      JOIN office_desk.role_permissions rp ON rp.role_id = udr.role_id
      JOIN office_desk.permissions p ON p.id = rp.permission_id
      WHERE udr.user_id = auth.uid()
      AND p.code = 'settings.manage'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- SCHEDULED REPORTS
-- ═══════════════════════════════════════════════════════════

CREATE TYPE office_desk.report_frequency AS ENUM (
  'daily', 'weekly', 'monthly', 'quarterly'
);

CREATE TABLE office_desk.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES office_desk.report_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency office_desk.report_frequency NOT NULL DEFAULT 'weekly',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'pdf', 'both')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE office_desk.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled reports in their desk"
  ON office_desk.scheduled_reports
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Users with settings.manage can manage scheduled reports"
  ON office_desk.scheduled_reports
  FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM office_desk.user_desk_roles udr
      JOIN office_desk.role_permissions rp ON rp.role_id = udr.role_id
      JOIN office_desk.permissions p ON p.id = rp.permission_id
      WHERE udr.user_id = auth.uid()
      AND p.code = 'settings.manage'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- REPORT LOGS
-- ═══════════════════════════════════════════════════════════

CREATE TYPE office_desk.report_log_status AS ENUM (
  'pending', 'running', 'completed', 'failed'
);

CREATE TABLE office_desk.report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
  scheduled_report_id UUID REFERENCES office_desk.scheduled_reports(id) ON DELETE SET NULL,
  template_id UUID REFERENCES office_desk.report_templates(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  format TEXT NOT NULL,
  status office_desk.report_log_status NOT NULL DEFAULT 'pending',
  row_count INTEGER DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  file_path TEXT,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE office_desk.report_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report logs in their desk"
  ON office_desk.report_logs
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "System can insert report logs"
  ON office_desk.report_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update report logs"
  ON office_desk.report_logs
  FOR UPDATE
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_report_templates_tenant ON office_desk.report_templates(tenant_id);
CREATE INDEX idx_report_templates_entity ON office_desk.report_templates(entity_type);
CREATE INDEX idx_scheduled_reports_tenant ON office_desk.scheduled_reports(tenant_id);
CREATE INDEX idx_scheduled_reports_next_run ON office_desk.scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_report_logs_tenant ON office_desk.report_logs(tenant_id);
CREATE INDEX idx_report_logs_scheduled ON office_desk.report_logs(scheduled_report_id);
CREATE INDEX idx_report_logs_status ON office_desk.report_logs(status);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: updated_at
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.handle_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_report_templates_updated_at
  BEFORE UPDATE ON office_desk.report_templates
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.handle_report_updated_at();

CREATE TRIGGER set_scheduled_reports_updated_at
  BEFORE UPDATE ON office_desk.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.handle_report_updated_at();

-- ═══════════════════════════════════════════════════════════
-- SEED: Default report templates
-- ═══════════════════════════════════════════════════════════

-- Insert default templates for Redhouse tenant
DO $$
DECLARE
  redhouse_tenant_id UUID;
BEGIN
  SELECT id INTO redhouse_tenant_id FROM auth.tenants WHERE name = 'Redhouse' LIMIT 1;
  
  IF redhouse_tenant_id IS NOT NULL THEN
    INSERT INTO office_desk.report_templates (tenant_id, name, description, report_type, entity_type, columns, is_default)
    VALUES
      (redhouse_tenant_id, 'Contact Summary', 'Basic contact information summary', 'summary', 'contacts', 
       '["name", "email", "phone", "company", "status", "created_at"]'::jsonb, true),
      (redhouse_tenant_id, 'Lead Pipeline', 'Lead status and pipeline overview', 'summary', 'leads',
       '["name", "email", "phone", "status", "source", "created_at"]'::jsonb, true),
      (redhouse_tenant_id, 'Invoice Report', 'Invoice status and payment summary', 'summary', 'invoices',
       '["invoice_number", "contact_name", "amount", "status", "due_date", "paid_at"]'::jsonb, true),
      (redhouse_tenant_id, 'Contact Detailed', 'Full contact details with activity', 'detailed', 'contacts',
       '["name", "email", "phone", "company", "position", "status", "tags", "notes", "created_at", "updated_at"]'::jsonb, false),
      (redhouse_tenant_id, 'Lead Detailed', 'Full lead details with call/email logs', 'detailed', 'leads',
       '["name", "email", "phone", "company", "status", "source", "assigned_to", "call_count", "email_count", "created_at"]'::jsonb, false),
      (redhouse_tenant_id, 'Invoice Detailed', 'Full invoice details with line items', 'detailed', 'invoices',
       '["invoice_number", "contact_name", "amount", "amount_paid", "status", "items", "payments", "created_at"]'::jsonb, false);
  END IF;
END $$;
