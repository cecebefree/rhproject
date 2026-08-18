-- Helper function for E2E test seeding — bypasses tenant_id immutability trigger
CREATE OR REPLACE FUNCTION public.seed_profile_tenant(
  p_user_id uuid,
  p_tenant_id uuid
) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_assignment_bypass', 'true', true);
  UPDATE public.profiles SET tenant_id = p_tenant_id WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
