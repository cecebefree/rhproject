-- Migration 130: Invoice schema fixes + invoice_items table (Row 78)
-- Adds: lead_id, amount_paid, amount_total, due_date, invoice_items, status values

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- INVOICES — schema fixes
-- ═══════════════════════════════════════════════════════════

-- Add lead_id (optional, for direct lead billing)
ALTER TABLE office_desk.invoices ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES front_desk.leads(id);
CREATE INDEX IF NOT EXISTS idx_invoices_lead ON office_desk.invoices (lead_id);

-- Rename amount → amount_total, add amount_paid
ALTER TABLE office_desk.invoices ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) NOT NULL DEFAULT 0;

-- Rename due_at → due_date (if due_at exists, copy data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'office_desk' AND table_name = 'invoices' AND column_name = 'due_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'office_desk' AND table_name = 'invoices' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE office_desk.invoices RENAME COLUMN due_at TO due_date;
  END IF;
END $$;

-- Add due_date if neither exists
ALTER TABLE office_desk.invoices ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Expand status check to include 'overdue' and 'cancelled'
ALTER TABLE office_desk.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE office_desk.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'void'));

-- ═══════════════════════════════════════════════════════════
-- INVOICE ITEMS — line items table
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.invoice_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenant_lms(id),
  invoice_id    uuid NOT NULL REFERENCES office_desk.invoices(id) ON DELETE CASCADE,
  description   text NOT NULL,
  quantity      numeric(10,2) NOT NULL DEFAULT 1,
  unit_price    numeric(12,2) NOT NULL DEFAULT 0,
  total_price   numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON office_desk.invoice_items (invoice_id);

-- ═══════════════════════════════════════════════════════════
-- RLS: INVOICES
-- ═══════════════════════════════════════════════════════════
ALTER TABLE office_desk.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inv_admin_all ON office_desk.invoices;
CREATE POLICY inv_admin_all ON office_desk.invoices
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS inv_office_select ON office_desk.invoices;
CREATE POLICY inv_office_select ON office_desk.invoices
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

DROP POLICY IF EXISTS inv_office_insert ON office_desk.invoices;
CREATE POLICY inv_office_insert ON office_desk.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

DROP POLICY IF EXISTS inv_office_update ON office_desk.invoices;
CREATE POLICY inv_office_update ON office_desk.invoices
  FOR UPDATE TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- RLS: INVOICE ITEMS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE office_desk.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inv_items_admin_all ON office_desk.invoice_items;
CREATE POLICY inv_items_admin_all ON office_desk.invoice_items
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS inv_items_office_select ON office_desk.invoice_items;
CREATE POLICY inv_items_office_select ON office_desk.invoice_items
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

DROP POLICY IF EXISTS inv_items_office_insert ON office_desk.invoice_items;
CREATE POLICY inv_items_office_insert ON office_desk.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

DROP POLICY IF EXISTS inv_items_office_update ON office_desk.invoice_items;
CREATE POLICY inv_items_office_update ON office_desk.invoice_items
  FOR UPDATE TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════
CREATE TRIGGER trg_invoice_items_updated_at
  BEFORE UPDATE ON office_desk.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON office_desk.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON office_desk.invoice_items TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE office_desk.invoices IS 'Row 78: Manual/ad-hoc invoices for Office Desk billing';
COMMENT ON TABLE office_desk.invoice_items IS 'Row 78: Line items for invoices (description, qty, unit_price, computed total)';
COMMENT ON COLUMN office_desk.invoices.lead_id IS 'Optional link to front_desk.leads for direct lead billing';
COMMENT ON COLUMN office_desk.invoices.amount_paid IS 'Amount already paid toward this invoice';
COMMENT ON COLUMN office_desk.invoices.due_date IS 'Payment due date';
COMMENT ON COLUMN office_desk.invoice_items.total_price IS 'Computed: quantity * unit_price';

COMMIT;
