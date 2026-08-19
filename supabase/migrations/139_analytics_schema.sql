-- Migration 139: Analytics Dashboard
-- Creates user_activity_log, conversion_events, revenue_metrics tables

-- ═══════════════════════════════════════════════════════════
-- USER ACTIVITY LOG TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'button_click', 'form_submit', 'search',
    'export', 'import', 'login', 'logout', 'api_call'
  )),
  event_category TEXT NOT NULL CHECK (event_category IN (
    'navigation', 'interaction', 'data', 'auth', 'system'
  )),
  page_path TEXT,
  element_id TEXT,
  element_text TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for activity log
CREATE INDEX idx_user_activity_tenant ON office_desk.user_activity_log(tenant_id);
CREATE INDEX idx_user_activity_user ON office_desk.user_activity_log(user_id);
CREATE INDEX idx_user_activity_event_type ON office_desk.user_activity_log(event_type);
CREATE INDEX idx_user_activity_created ON office_desk.user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_page ON office_desk.user_activity_log(page_path) WHERE page_path IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- CONVERSION EVENTS TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES front_desk.leads(id) ON DELETE SET NULL,
  contact_id UUID,
  invoice_id UUID,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN (
    'lead_to_contact', 'contact_to_invoice', 'lead_to_invoice',
    'invoice_paid', 'lead_convert'
  )),
  source_status TEXT,
  target_status TEXT,
  conversion_value NUMERIC(12,2),
  currency TEXT DEFAULT 'ZAR',
  conversion_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for conversion events
CREATE INDEX idx_conversion_tenant ON office_desk.conversion_events(tenant_id);
CREATE INDEX idx_conversion_lead ON office_desk.conversion_events(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_conversion_type ON office_desk.conversion_events(conversion_type);
CREATE INDEX idx_conversion_created ON office_desk.conversion_events(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- REVENUE METRICS TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_period TEXT NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  total_revenue NUMERIC(12,2) DEFAULT 0,
  paid_revenue NUMERIC(12,2) DEFAULT 0,
  pending_revenue NUMERIC(12,2) DEFAULT 0,
  invoice_count INTEGER DEFAULT 0,
  paid_invoice_count INTEGER DEFAULT 0,
  average_invoice_value NUMERIC(12,2) DEFAULT 0,
  new_contacts INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  converted_leads INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, metric_date, metric_period)
);

-- Indexes for revenue metrics
CREATE INDEX idx_revenue_tenant ON office_desk.revenue_metrics(tenant_id);
CREATE INDEX idx_revenue_date ON office_desk.revenue_metrics(metric_date DESC);
CREATE INDEX idx_revenue_period ON office_desk.revenue_metrics(metric_period);
CREATE INDEX idx_revenue_tenant_date ON office_desk.revenue_metrics(tenant_id, metric_date DESC);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.update_analytics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_revenue_metrics_updated_at
  BEFORE UPDATE ON office_desk.revenue_metrics
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_analytics_timestamp();

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Admin can view all activity
CREATE POLICY activity_log_admin_select ON office_desk.user_activity_log
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk can view activity
CREATE POLICY activity_log_office_desk_select ON office_desk.user_activity_log
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage activity
CREATE POLICY activity_log_service_role ON office_desk.user_activity_log
  FOR ALL
  USING (true);

-- Users can insert their own activity
CREATE POLICY activity_log_insert_own ON office_desk.user_activity_log
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Admin can view conversion events
CREATE POLICY conversion_events_admin_select ON office_desk.conversion_events
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk can view conversion events
CREATE POLICY conversion_events_office_desk_select ON office_desk.conversion_events
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage conversion events
CREATE POLICY conversion_events_service_role ON office_desk.conversion_events
  FOR ALL
  USING (true);

-- Admin can view revenue metrics
CREATE POLICY revenue_metrics_admin_select ON office_desk.revenue_metrics
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Office desk can view revenue metrics
CREATE POLICY revenue_metrics_office_desk_select ON office_desk.revenue_metrics
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'office_desk'
    AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Service role can manage revenue metrics
CREATE POLICY revenue_metrics_service_role ON office_desk.revenue_metrics
  FOR ALL
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

-- Grant usage on schema
GRANT USAGE ON SCHEMA office_desk TO authenticated;
GRANT USAGE ON SCHEMA office_desk TO service_role;

-- Grant table access
GRANT ALL ON office_desk.user_activity_log TO authenticated;
GRANT ALL ON office_desk.conversion_events TO authenticated;
GRANT ALL ON office_desk.revenue_metrics TO authenticated;
GRANT ALL ON office_desk.user_activity_log TO service_role;
GRANT ALL ON office_desk.conversion_events TO service_role;
GRANT ALL ON office_desk.revenue_metrics TO service_role;

-- Grant sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA office_desk TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA office_desk TO service_role;

-- ═══════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Function to log user activity
CREATE OR REPLACE FUNCTION office_desk.log_user_activity(
  p_tenant_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_event_category TEXT,
  p_page_path TEXT DEFAULT NULL,
  p_element_id TEXT DEFAULT NULL,
  p_element_text TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO office_desk.user_activity_log (
    tenant_id, user_id, event_type, event_category,
    page_path, element_id, element_text, metadata
  ) VALUES (
    p_tenant_id, p_user_id, p_event_type, p_event_category,
    p_page_path, p_element_id, p_element_text, p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record conversion event
CREATE OR REPLACE FUNCTION office_desk.record_conversion(
  p_tenant_id UUID,
  p_lead_id UUID,
  p_conversion_type TEXT,
  p_source_status TEXT DEFAULT NULL,
  p_target_status TEXT DEFAULT NULL,
  p_conversion_value NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_conversion_id UUID;
BEGIN
  INSERT INTO office_desk.conversion_events (
    tenant_id, lead_id, conversion_type,
    source_status, target_status, conversion_value, metadata
  ) VALUES (
    p_tenant_id, p_lead_id, p_conversion_type,
    p_source_status, p_target_status, p_conversion_value, p_metadata
  ) RETURNING id INTO v_conversion_id;
  
  RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily revenue metrics
CREATE OR REPLACE FUNCTION office_desk.calculate_daily_metrics(
  p_tenant_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_total_revenue NUMERIC;
  v_paid_revenue NUMERIC;
  v_pending_revenue NUMERIC;
  v_invoice_count INTEGER;
  v_paid_invoice_count INTEGER;
  v_new_contacts INTEGER;
  v_new_leads INTEGER;
  v_converted_leads INTEGER;
BEGIN
  -- Calculate invoice metrics
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') THEN amount ELSE 0 END), 0),
    COUNT(*),
    COUNT(CASE WHEN status = 'paid' THEN 1 END)
  INTO v_total_revenue, v_paid_revenue, v_pending_revenue, v_invoice_count, v_paid_invoice_count
  FROM office_desk.invoices
  WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = p_date
    AND deleted_at IS NULL;

  -- Calculate contact/lead metrics
  SELECT COUNT(*) INTO v_new_contacts
  FROM profiles
  WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = p_date;

  SELECT COUNT(*) INTO v_new_leads
  FROM front_desk.leads
  WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = p_date;

  SELECT COUNT(*) INTO v_converted_leads
  FROM front_desk.leads
  WHERE tenant_id = p_tenant_id
    AND DATE(updated_at) = p_date
    AND status = 'handed_off';

  -- Upsert metrics
  INSERT INTO office_desk.revenue_metrics (
    tenant_id, metric_date, metric_period,
    total_revenue, paid_revenue, pending_revenue,
    invoice_count, paid_invoice_count,
    average_invoice_value,
    new_contacts, new_leads, converted_leads,
    conversion_rate
  ) VALUES (
    p_tenant_id, p_date, 'daily',
    v_total_revenue, v_paid_revenue, v_pending_revenue,
    v_invoice_count, v_paid_invoice_count,
    CASE WHEN v_invoice_count > 0 THEN v_total_revenue / v_invoice_count ELSE 0 END,
    v_new_contacts, v_new_leads, v_converted_leads,
    CASE WHEN v_new_leads > 0 THEN (v_converted_leads::NUMERIC / v_new_leads) * 100 ELSE 0 END
  )
  ON CONFLICT (tenant_id, metric_date, metric_period)
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    paid_revenue = EXCLUDED.paid_revenue,
    pending_revenue = EXCLUDED.pending_revenue,
    invoice_count = EXCLUDED.invoice_count,
    paid_invoice_count = EXCLUDED.paid_invoice_count,
    average_invoice_value = EXCLUDED.average_invoice_value,
    new_contacts = EXCLUDED.new_contacts,
    new_leads = EXCLUDED.new_leads,
    converted_leads = EXCLUDED.converted_leads,
    conversion_rate = EXCLUDED.conversion_rate,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
