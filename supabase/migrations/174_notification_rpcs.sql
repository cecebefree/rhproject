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
  v_preferences RECORD;
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
