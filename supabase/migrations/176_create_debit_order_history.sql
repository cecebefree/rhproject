-- Debit order history (audit trail) — already created in 171, this is a no-op safety net
CREATE TABLE IF NOT EXISTS public.debit_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_order_id UUID NOT NULL REFERENCES public.debit_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'activated', 'paused', 'resumed', 'cancelled', 'debit_attempted', 'debit_succeeded', 'debit_failed', 'retry_scheduled')),
  status_before TEXT,
  status_after TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debit_order_history_debit_order_id ON public.debit_order_history(debit_order_id);
CREATE INDEX IF NOT EXISTS idx_debit_order_history_action ON public.debit_order_history(action);

ALTER TABLE public.debit_order_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'students_view_own_debit_history') THEN
    CREATE POLICY "students_view_own_debit_history" ON public.debit_order_history
      FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.debit_orders WHERE id = debit_order_id AND student_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_insert_debit_history') THEN
    CREATE POLICY "service_role_insert_debit_history" ON public.debit_order_history
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
