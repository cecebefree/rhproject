-- Debit order execution: record a payment and advance the schedule

CREATE OR REPLACE FUNCTION public.execute_debit_order(
  p_debit_order_id UUID,
  p_status TEXT DEFAULT 'succeeded'
)
RETURNS TABLE(payment_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
  v_next_date DATE;
BEGIN
  SELECT * INTO v_order
    FROM public.debit_orders
    WHERE id = p_debit_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debit order % not found', p_debit_order_id;
  END IF;

  IF v_order.status NOT IN ('scheduled', 'active') THEN
    RAISE EXCEPTION 'Debit order % cannot be executed (status: %)', p_debit_order_id, v_order.status;
  END IF;

  -- Record payment
  INSERT INTO public.payments (
    student_id, amount, status, payment_type,
    debit_order_id, tenant_id, created_at
  ) VALUES (
    v_order.student_id, v_order.amount, p_status, 'debit_order',
    p_debit_order_id, v_order.tenant_id, now()
  )
  RETURNING payments.id INTO v_payment_id;

  -- Update debit order
  UPDATE public.debit_orders
  SET last_debit_date = now(),
      failed_attempts = CASE WHEN p_status != 'succeeded' THEN failed_attempts + 1 ELSE failed_attempts END,
      status = CASE
        WHEN p_status = 'succeeded' AND next_debit_date >= end_date THEN 'completed'
        WHEN p_status != 'succeeded' AND failed_attempts + 1 >= max_retries THEN 'failed'
        ELSE status
      END,
      next_debit_date = CASE
        WHEN p_status = 'succeeded' THEN
          CASE frequency
            WHEN 'weekly' THEN next_debit_date + INTERVAL '7 days'
            WHEN 'biweekly' THEN next_debit_date + INTERVAL '14 days'
            WHEN 'monthly' THEN next_debit_date + INTERVAL '1 month'
            WHEN 'quarterly' THEN next_debit_date + INTERVAL '3 months'
            WHEN 'annually' THEN next_debit_date + INTERVAL '1 year'
            ELSE next_debit_date + INTERVAL '1 month'
          END
        ELSE next_debit_date
      END
  WHERE id = p_debit_order_id;

  RETURN QUERY SELECT v_payment_id, p_status;
END;
$$;

COMMENT ON FUNCTION public.execute_debit_order(UUID, TEXT)
  IS 'Execute a debit order: record payment + advance schedule. Use p_status=failed for failed attempts.';

GRANT EXECUTE ON FUNCTION public.execute_debit_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_debit_order(UUID, TEXT) TO service_role;
