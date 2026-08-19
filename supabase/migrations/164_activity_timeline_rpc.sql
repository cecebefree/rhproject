-- Migration 164: Activity timeline RPC function
-- Returns merged activity_log + communication_log for an inquiry

BEGIN;

DROP FUNCTION IF EXISTS public.get_activity_timeline(UUID);

CREATE OR REPLACE FUNCTION public.get_activity_timeline(p_inquiry_id UUID)
RETURNS TABLE (
  ts TIMESTAMPTZ,
  desk VARCHAR,
  action VARCHAR,
  performed_by TEXT,
  notes TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      al.timestamp AS ts,
      al.desk::VARCHAR,
      al.action::VARCHAR,
      COALESCE(sp.name, 'system') AS performed_by,
      al.data->>'notes' AS notes,
      al.data AS details
    FROM front_desk.activity_log al
    LEFT JOIN public.staff_profiles sp ON sp.id = al.performed_by
    WHERE al.inquiry_id = p_inquiry_id
    UNION ALL
    SELECT
      cl.sent_at AS ts,
      'COMMS'::TEXT AS desk,
      CASE cl.channel
        WHEN 'email' THEN 'Email sent'
        WHEN 'sms' THEN 'SMS sent'
        ELSE cl.channel || ' sent'
      END AS action,
      'system'::TEXT AS performed_by,
      COALESCE(cl.subject || ': ' || LEFT(COALESCE(cl.body, ''), 80), cl.subject, '') AS notes,
      jsonb_build_object('channel', cl.channel, 'recipient', cl.recipient, 'status', cl.delivery_status) AS details
    FROM front_desk.communication_log cl
    WHERE cl.inquiry_id = p_inquiry_id
  ) combined
  ORDER BY combined.ts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_activity_timeline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_timeline(UUID) TO service_role;

COMMENT ON FUNCTION public.get_activity_timeline(UUID) IS 'Returns merged activity timeline (activity_log + communication_log) for an inquiry, sorted newest first';

COMMIT;
