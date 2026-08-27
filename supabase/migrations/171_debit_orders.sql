-- Add missing columns to existing debit_orders table (created in 001_init_schema)
ALTER TABLE public.debit_orders
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS bank_account_id TEXT,
  ADD COLUMN IF NOT EXISTS mandate_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_debit_date DATE,
  ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retry_day INT DEFAULT 5;

-- Add indexes for new/existing columns
CREATE INDEX IF NOT EXISTS idx_debit_orders_student_id ON public.debit_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_debit_orders_invoice_id ON public.debit_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_debit_orders_status ON public.debit_orders(status);
CREATE INDEX IF NOT EXISTS idx_debit_orders_next_debit_date ON public.debit_orders(next_debit_date);

-- Debit order history (audit trail)
CREATE TABLE IF NOT EXISTS public.debit_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_order_id UUID NOT NULL REFERENCES public.debit_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'activated', 'paused', 'resumed', 'cancelled', 'debit_attempted', 'debit_succeeded', 'debit_failed', 'retry_scheduled')),
  status_before TEXT,
  status_after TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_debit_order_history_debit_order_id ON public.debit_order_history(debit_order_id);
CREATE INDEX idx_debit_order_history_action ON public.debit_order_history(action);

-- RLS policies
ALTER TABLE public.debit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_order_history ENABLE ROW LEVEL SECURITY;

-- Students can view their own debit orders
CREATE POLICY "students_view_own_debit_orders" ON public.debit_orders
  FOR SELECT USING (student_id = auth.uid());

-- Service role (webhooks) can update debit orders
CREATE POLICY "service_role_manage_debit_orders" ON public.debit_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Students can view their debit order history
CREATE POLICY "students_view_own_debit_history" ON public.debit_order_history
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.debit_orders WHERE id = debit_order_id AND student_id = auth.uid())
  );

-- Service role can insert debit order history
CREATE POLICY "service_role_insert_debit_history" ON public.debit_order_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
