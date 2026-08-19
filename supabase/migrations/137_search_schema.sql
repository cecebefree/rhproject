-- Row 2: Search & Filtering schema
-- saved_searches table with RLS, full-text indexes

-- ═══════════════════════════════════════════════════════════
-- SAVED SEARCHES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE office_desk.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'leads', 'invoices', 'all')),
  search_query TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_by TEXT NOT NULL DEFAULT 'created_at',
  sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE office_desk.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved searches"
  ON office_desk.saved_searches
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Users can manage their own saved searches"
  ON office_desk.saved_searches
  FOR ALL
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

-- ═══════════════════════════════════════════════════════════
-- SEARCH HISTORY (for recent searches)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE office_desk.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'leads', 'invoices', 'all')),
  search_query TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_count INTEGER NOT NULL DEFAULT 0,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE office_desk.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history"
  ON office_desk.search_history
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Users can insert their own search history"
  ON office_desk.search_history
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM office_desk.user_desks WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Users can delete their own search history"
  ON office_desk.search_history
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_saved_searches_user ON office_desk.saved_searches(user_id);
CREATE INDEX idx_saved_searches_tenant ON office_desk.saved_searches(tenant_id);
CREATE INDEX idx_saved_searches_entity ON office_desk.saved_searches(entity_type);
CREATE INDEX idx_search_history_user ON office_desk.search_history(user_id);
CREATE INDEX idx_search_history_tenant ON office_desk.search_history(tenant_id);
CREATE INDEX idx_search_history_searched ON office_desk.search_history(searched_at DESC);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: updated_at
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.handle_saved_search_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_saved_searches_updated_at
  BEFORE UPDATE ON office_desk.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.handle_saved_search_updated_at();

-- ═══════════════════════════════════════════════════════════
-- FULL-TEXT SEARCH INDEXES
-- ═══════════════════════════════════════════════════════════

-- Contacts (leads table used as contacts)
CREATE INDEX IF NOT EXISTS idx_leads_name_fts 
  ON front_desk.leads USING gin(to_tsvector('english', coalesce(name, '')));

CREATE INDEX IF NOT EXISTS idx_leads_email_fts 
  ON front_desk.leads USING gin(to_tsvector('english', coalesce(email, '')));

CREATE INDEX IF NOT EXISTS idx_leads_company_fts 
  ON front_desk.leads USING gin(to_tsvector('english', coalesce(company, '')));

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_number_fts 
  ON office_desk.invoices USING gin(to_tsvector('english', coalesce(invoice_number, '')));

CREATE INDEX IF NOT EXISTS idx_invoices_description_fts 
  ON office_desk.invoices USING gin(to_tsvector('english', coalesce(description, '')));

-- ═══════════════════════════════════════════════════════════
-- GIN indexes for JSONB filter queries
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_saved_searches_filters_gin 
  ON office_desk.saved_searches USING gin(filters);

CREATE INDEX IF NOT EXISTS idx_search_history_filters_gin 
  ON office_desk.search_history USING gin(filters);
