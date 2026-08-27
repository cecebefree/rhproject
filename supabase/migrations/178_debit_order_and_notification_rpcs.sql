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

-- RPC: Send notification (queues notification)
CREATE OR REPLACE FUNCTION send_notification(
  p_student_id UUID,
  p_notification_type_id TEXT,
  p_metadata JSONB
)
RETURNS TABLE(notification_id UUID, status TEXT, error TEXT) AS $$
DECLARE
  v_notification_id UUID;
  v_template_subject TEXT;
  v_template_body TEXT;
  v_channels TEXT[];
  v_subject TEXT;
  v_body TEXT;
BEGIN
  -- Get notification type
  SELECT template_subject, template_body, channels 
  INTO v_template_subject, v_template_body, v_channels
  FROM notification_types
  WHERE id = p_notification_type_id AND is_enabled = TRUE;
  
  IF v_template_subject IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'Notification type not found'::TEXT;
    RETURN;
  END IF;
  
  -- Render templates (simple string replacement)
  v_subject := v_template_subject;
  v_body := v_template_body;
  
  -- Replace template variables from metadata
  v_subject := REPLACE(v_subject, '{{student_name}}', COALESCE(p_metadata->>'student_name', ''));
  v_subject := REPLACE(v_subject, '{{amount}}', COALESCE(p_metadata->>'amount', ''));
  v_subject := REPLACE(v_subject, '{{invoice_number}}', COALESCE(p_metadata->>'invoice_number', ''));
  
  v_body := REPLACE(v_body, '{{student_name}}', COALESCE(p_metadata->>'student_name', ''));
  v_body := REPLACE(v_body, '{{amount}}', COALESCE(p_metadata->>'amount', ''));
  v_body := REPLACE(v_body, '{{due_date}}', COALESCE(p_metadata->>'due_date', ''));
  v_body := REPLACE(v_body, '{{frequency}}', COALESCE(p_metadata->>'frequency', ''));
  v_body := REPLACE(v_body, '{{attempt_date}}', COALESCE(p_metadata->>'attempt_date', ''));
  v_body := REPLACE(v_body, '{{retry_date}}', COALESCE(p_metadata->>'retry_date', ''));
  v_body := REPLACE(v_body, '{{course_name}}', COALESCE(p_metadata->>'course_name', ''));
  
  -- Create notification
  INSERT INTO notifications(
    student_id, notification_type_id, subject, body, channels, metadata,
    status, created_at
  )
  VALUES(
    p_student_id, p_notification_type_id, v_subject, v_body, v_channels, p_metadata,
    'pending', NOW()
  )
  RETURNING id INTO v_notification_id;
  
  -- Log to audit
  INSERT INTO audit_log(user_id, action, resource_type, resource_id, details, created_at)
  VALUES(
    p_student_id, 'notification_queued', 'notification', v_notification_id::TEXT,
    jsonb_build_object('type_id', p_notification_type_id),
    NOW()
  );
  
  RETURN QUERY SELECT v_notification_id, 'pending'::TEXT, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, NULL::TEXT, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_notification TO authenticated;

-- RPC: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID
)
RETURNS TABLE(status TEXT, error TEXT) AS $$
BEGIN
  UPDATE notifications
  SET status = 'read', read_at = NOW(), updated_at = NOW()
  WHERE id = p_notification_id AND student_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, 'Notification not found'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'read'::TEXT, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::TEXT, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;

-- RPC: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS TABLE(count INT) AS $$
BEGIN
  RETURN QUERY SELECT COUNT(*)::INT FROM notifications
  WHERE student_id = auth.uid() AND status IN ('pending', 'sent');
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 0::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
