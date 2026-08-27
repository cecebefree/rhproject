-- RPC: Create debit order
CREATE OR REPLACE FUNCTION create_debit_order(
  p_student_id UUID,
  p_invoice_id UUID,
  p_amount DECIMAL,
  p_frequency TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_bank_account_id TEXT
)
RETURNS TABLE(debit_order_id UUID, status TEXT, next_debit_date DATE, error TEXT) AS $$
DECLARE
  v_debit_order_id UUID;
  v_next_debit_date DATE;
BEGIN
  -- Validate inputs
  IF p_frequency NOT IN ('monthly', 'term', 'annual') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::DATE, 'Invalid frequency'::TEXT;
    RETURN;
  END IF;
  
  IF p_start_date > COALESCE(p_end_date, p_start_date + INTERVAL '365 days') THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::DATE, 'Invalid date range'::TEXT;
    RETURN;
  END IF;
  
  -- Verify student exists
  IF NOT EXISTS(SELECT 1 FROM students WHERE id = p_student_id) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::DATE, 'Student not found'::TEXT;
    RETURN;
  END IF;
  
  -- Verify invoice exists
  IF NOT EXISTS(SELECT 1 FROM invoices WHERE id = p_invoice_id) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::DATE, 'Invoice not found'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate next debit date
  v_next_debit_date := p_start_date;
  
  -- Create debit order
  INSERT INTO debit_orders(
    student_id, invoice_id, amount, frequency, start_date, end_date,
    status, bank_account_id, next_debit_date, created_at
  )
  VALUES(
    p_student_id, p_invoice_id, p_amount, p_frequency, p_start_date, 
    COALESCE(p_end_date, p_start_date + INTERVAL '365 days'),
    'pending', p_bank_account_id, v_next_debit_date, NOW()
  )
  RETURNING id INTO v_debit_order_id;
  
  -- Log to debit order history
  INSERT INTO debit_order_history(debit_order_id, action, status_before, status_after, details)
  VALUES(
    v_debit_order_id, 'created', NULL, 'pending',
    jsonb_build_object(
      'frequency', p_frequency,
      'amount', p_amount,
      'start_date', p_start_date,
      'bank_account_id', p_bank_account_id
    )
  );
  
  -- Log to audit
  INSERT INTO audit_log(user_id, action, resource_type, resource_id, details, created_at)
  VALUES(
    p_student_id, 'debit_order_created', 'debit_order', v_debit_order_id::TEXT,
    jsonb_build_object('frequency', p_frequency, 'amount', p_amount),
    NOW()
  );
  
  RETURN QUERY SELECT v_debit_order_id, 'pending'::TEXT, v_next_debit_date, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::DATE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_debit_order TO authenticated;

-- RPC: Activate debit order (after mandate signed)
CREATE OR REPLACE FUNCTION activate_debit_order(
  p_debit_order_id UUID,
  p_mandate_reference TEXT
)
RETURNS TABLE(status TEXT, next_debit_date DATE, error TEXT) AS $$
DECLARE
  v_status TEXT;
  v_next_debit_date DATE;
BEGIN
  -- Verify debit order exists
  IF NOT EXISTS(SELECT 1 FROM debit_orders WHERE id = p_debit_order_id) THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::DATE, 'Debit order not found'::TEXT;
    RETURN;
  END IF;
  
  -- Update debit order
  UPDATE debit_orders
  SET status = 'active', mandate_reference = p_mandate_reference, updated_at = NOW()
  WHERE id = p_debit_order_id
  RETURNING status, next_debit_date INTO v_status, v_next_debit_date;
  
  -- Log to history
  INSERT INTO debit_order_history(debit_order_id, action, status_before, status_after)
  VALUES(p_debit_order_id, 'activated', 'pending', 'active');
  
  RETURN QUERY SELECT v_status, v_next_debit_date, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::TEXT, NULL::DATE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION activate_debit_order TO authenticated;

-- RPC: Cancel debit order
CREATE OR REPLACE FUNCTION cancel_debit_order(
  p_debit_order_id UUID,
  p_reason TEXT
)
RETURNS TABLE(status TEXT, error TEXT) AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM debit_orders WHERE id = p_debit_order_id;
  
  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT NULL::TEXT, 'Debit order not found'::TEXT;
    RETURN;
  END IF;
  
  -- Update status
  UPDATE debit_orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_debit_order_id;
  
  -- Log to history
  INSERT INTO debit_order_history(debit_order_id, action, status_before, status_after, details)
  VALUES(
    p_debit_order_id, 'cancelled', v_old_status, 'cancelled',
    jsonb_build_object('reason', p_reason)
  );
  
  RETURN QUERY SELECT 'cancelled'::TEXT, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::TEXT, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_debit_order TO authenticated;
