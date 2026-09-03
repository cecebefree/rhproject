CREATE OR REPLACE FUNCTION public.insert_website_lead(
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_tenant text,
  p_turnstile_token text,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO public.website_leads (
    name, email, phone, message, tenant, turnstile_token, ip_address
  ) VALUES (
    p_name, p_email, p_phone, p_message, p_tenant, p_turnstile_token, p_ip_address
  )
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.insert_website_lead(text, text, text, text, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.insert_website_lead IS 'Insert website lead with tenant context; accessible to anon & authenticated';
