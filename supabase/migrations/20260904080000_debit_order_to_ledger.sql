-- Debit Orders → Ledger (payments)
-- 1. Add debit_order_id to public.payments
-- 2. Create function to record debit order payment

-- 1. Add debit_order_id to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS debit_order_id UUID REFERENCES public.debit_orders(id),
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_payments_debit_order_id ON public.payments(debit_order_id) WHERE debit_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id) WHERE tenant_id IS NOT NULL;

-- 2. Function: record debit order payment in ledger
CREATE OR REPLACE FUNCTION public.record_debit_order_payment(
  p_debit_order_id UUID,
  p_amount NUMERIC,
  p_status TEXT DEFAULT 'completed',
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_do RECORD;
  v_payment_id UUID;
  v_tenant_id UUID;
BEGIN
  SELECT * INTO v_do FROM public.debit_orders WHERE id = p_debit_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debit order % not found', p_debit_order_id;
  END IF;

  -- Get tenant from student
  SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = v_do.student_id;

  INSERT INTO public.payments (
    student_id, amount, status, payment_type,
    debit_order_id, tenant_id,
    stripe_payment_intent_id,
    created_by, updated_by
  ) VALUES (
    v_do.student_id, p_amount, p_status, 'debit_order',
    p_debit_order_id, v_tenant_id,
    p_stripe_payment_intent_id,
    auth.uid(), auth.uid()
  )
  RETURNING id INTO v_payment_id;

  -- Update debit order
  UPDATE public.debit_orders
    SET last_debit_date = CURRENT_DATE,
        next_debit_date = CASE
          WHEN frequency = 'weekly' THEN CURRENT_DATE + 7
          WHEN frequency = 'biweekly' THEN CURRENT_DATE + 14
          WHEN frequency = 'monthly' THEN CURRENT_DATE + 30
          WHEN frequency = 'quarterly' THEN CURRENT_DATE + 90
          WHEN frequency = 'annually' THEN CURRENT_DATE + 365
          ELSE CURRENT_DATE + 30
        END,
        updated_at = now()
    WHERE id = p_debit_order_id;

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION public.record_debit_order_payment(UUID, NUMERIC, TEXT, TEXT)
  IS 'Records a debit order payment in the ledger and advances the schedule. SECURITY DEFINER to bypass RLS.';

GRANT EXECUTE ON FUNCTION public.record_debit_order_payment(UUID, NUMERIC, TEXT, TEXT) TO service_role;
