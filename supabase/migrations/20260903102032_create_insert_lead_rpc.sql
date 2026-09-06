-- ═══════════════════════════════════════════════════════════
-- Drop old SECURITY DEFINER version if it exists
-- ═══════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.insert_lead(uuid, text, text, text, text, text, text, text[], text, text, boolean);

-- ═══════════════════════════════════════════════════════════
-- Create insert_lead with SECURITY INVOKER
-- Runs as the authenticated caller, so RLS policies apply
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.insert_lead(
  p_tenant_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_source text,
  p_source_type text,
  p_tags text[],
  p_status text,
  p_time_zone text,
  p_existing_profile boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $function$
DECLARE
  v_lead_id UUID;
BEGIN
  INSERT INTO front_desk.leads (
    tenant_id, name, email, phone, notes, source, source_type, tags, status, time_zone, existing_profile
  ) VALUES (
    p_tenant_id, p_name, p_email, p_phone, p_notes, p_source, p_source_type, p_tags, p_status, p_time_zone, p_existing_profile
  )
  RETURNING id INTO v_lead_id;
  RETURN v_lead_id;
END;
$function$;

COMMIT;
