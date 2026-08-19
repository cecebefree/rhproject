-- Migration 163: Dashboard metrics RPC function
-- Returns aggregated metrics for Front Desk dashboard

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(period TEXT DEFAULT 'today')
RETURNS TABLE (
  inquiries_received BIGINT,
  avg_response_time_seconds NUMERIC,
  callbacks_scheduled BIGINT,
  show_rate_percent NUMERIC,
  conversion_percent NUMERIC
) AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  start_date := CASE period
    WHEN 'today' THEN NOW()::DATE
    WHEN 'week' THEN NOW() - INTERVAL '7 days'
    WHEN 'month' THEN NOW() - INTERVAL '30 days'
    ELSE NOW()::DATE
  END;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE created_at >= start_date),
    ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))) FILTER (WHERE assigned_at IS NOT NULL), 2),
    COUNT(*) FILTER (WHERE call_scheduled_at IS NOT NULL AND call_started_at IS NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE call_started_at IS NOT NULL) /
      NULLIF(COUNT(*) FILTER (WHERE call_scheduled_at IS NOT NULL), 0), 2),
    ROUND(100.0 * COUNT(*) FILTER (WHERE enrollment_status = 'offered') /
      NULLIF(COUNT(*) FILTER (WHERE call_started_at IS NOT NULL), 0), 2)
  FROM front_desk.inquiries
  WHERE created_at >= start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(TEXT) TO service_role;

COMMENT ON FUNCTION public.get_dashboard_metrics(TEXT) IS 'Returns Front Desk dashboard metrics: inquiries, response time, callbacks, show rate, conversion rate';

COMMIT;
