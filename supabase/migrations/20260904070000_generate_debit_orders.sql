-- Function: generate debit order schedule from contract

CREATE OR REPLACE FUNCTION public.generate_debit_orders_from_contract(
  p_contract_id UUID,
  p_amount NUMERIC,
  p_frequency TEXT DEFAULT 'monthly',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_student_id UUID DEFAULT NULL,
  p_registration_id UUID DEFAULT NULL
)
RETURNS TABLE(debit_order_id UUID, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_student_id UUID;
  v_tenant_id UUID;
  v_start DATE;
  v_end DATE;
  v_next DATE;
  v_amount NUMERIC;
  v_interval INTERVAL;
BEGIN
  -- Load contract if provided
  IF p_contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contract % not found', p_contract_id;
    END IF;
    v_student_id := v_contract.student_id;
    v_tenant_id := v_contract.tenant_id;
    v_start := COALESCE(p_start_date, v_contract.start_date, CURRENT_DATE);
    v_end := COALESCE(p_end_date, v_contract.end_date, CURRENT_DATE + INTERVAL '1 year');
  ELSE
    v_student_id := p_student_id;
    v_start := COALESCE(p_start_date, CURRENT_DATE);
    v_end := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '1 year');

    IF v_student_id IS NULL THEN
      RAISE EXCEPTION 'Either p_contract_id or p_student_id is required';
    END IF;

    SELECT tenant_id INTO v_tenant_id
      FROM public.students WHERE id = v_student_id;
  END IF;

  -- Determine interval from frequency
  v_interval := CASE p_frequency
    WHEN 'weekly' THEN INTERVAL '1 week'
    WHEN 'biweekly' THEN INTERVAL '2 weeks'
    WHEN 'monthly' THEN INTERVAL '1 month'
    WHEN 'quarterly' THEN INTERVAL '3 months'
    WHEN 'annually' THEN INTERVAL '1 year'
    ELSE INTERVAL '1 month'
  END;

  -- Calculate per-payment amount
  v_amount := p_amount;

  -- Generate debit order entries
  v_next := v_start;
  WHILE v_next <= v_end LOOP
    INSERT INTO public.debit_orders (
      student_id, amount, frequency, status,
      next_debit_date, start_date, end_date,
      created_by, updated_by
    ) VALUES (
      v_student_id, v_amount, p_frequency, 'scheduled',
      v_next, v_start, v_end,
      auth.uid(), auth.uid()
    )
    RETURNING debit_orders.id, debit_orders.status
      INTO debit_order_id, status;

    v_next := v_next + v_interval;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.generate_debit_orders_from_contract(UUID, NUMERIC, TEXT, DATE, DATE, UUID, UUID)
  IS 'Generates a schedule of debit order entries from a contract. SECURITY DEFINER to bypass RLS.';

GRANT EXECUTE ON FUNCTION public.generate_debit_orders_from_contract(UUID, NUMERIC, TEXT, DATE, DATE, UUID, UUID) TO service_role;
