-- 057: Tenant Assignment Immutability Trigger + Master-Admin Assignment Function
-- Per Ruling R20: tenant_id is immutable once set (non-null), only master-admin can assign via Edge Function

BEGIN;

-- ============================================================
-- 1. SECURITY DEFINER function: assign_tenant_to_profile
--    Called by Edge Function assign_tenant after master-admin validation
--    Bypasses the immutability trigger (uses session variable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_tenant_to_profile(
    p_profile_id uuid,
    p_tenant_id uuid,
    p_caller_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_role text;
    v_caller_tenant_id uuid;
    v_target_profile_tenant_id uuid;
BEGIN
    -- Verify caller is master-admin of target tenant (defense in depth)
    SELECT p.role, p.tenant_id
      INTO v_caller_role, v_caller_tenant_id
      FROM public.profiles p
     WHERE p.id = p_caller_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'assign_tenant_to_profile: caller profile not found (%)', p_caller_id;
    END IF;

    IF v_caller_role <> 'admin' THEN
        RAISE EXCEPTION 'assign_tenant_to_profile: caller is not admin (%)', p_caller_id;
    END IF;

    IF v_caller_tenant_id IS NULL OR v_caller_tenant_id <> p_tenant_id THEN
        RAISE EXCEPTION 'assign_tenant_to_profile: caller not master-admin of target tenant (caller_tenant=%, target=%)', v_caller_tenant_id, p_tenant_id;
    END IF;
    -- Verify target tenant exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_devotional
         WHERE id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'assign_tenant_to_profile: target tenant not found or inactive (%)', p_tenant_id;
    END IF;

    -- Get current tenant_id of target profile
    SELECT p.tenant_id
      INTO v_target_profile_tenant_id
      FROM public.profiles p
     WHERE p.id = p_profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'assign_tenant_to_profile: target profile not found (%)', p_profile_id;
    END IF;

    -- Enforce immutability rules (only NULL -> uuid allowed once)
    IF v_target_profile_tenant_id IS NOT NULL THEN
        IF v_target_profile_tenant_id <> p_tenant_id THEN
            RAISE EXCEPTION 'assign_tenant_to_profile: tenant_id already set to different value (current=%, new=%)', v_target_profile_tenant_id, p_tenant_id;
        ELSE
            RAISE EXCEPTION 'assign_tenant_to_profile: tenant_id already set to this value (%)', p_tenant_id;
        END IF;
    END IF;

    -- Set session variable to bypass the immutability trigger
    PERFORM set_config('app.tenant_assignment_bypass', 'true', true);

    -- Perform the assignment
    UPDATE public.profiles
       SET tenant_id = p_tenant_id,
           updated_at = now()
     WHERE id = p_profile_id;

    -- Clear the bypass
    PERFORM set_config('app.tenant_assignment_bypass', 'false', true);
END;
$$;

-- ============================================================
-- 2. Immutability trigger function: enforce_tenant_id_immutability
--    Blocks ALL direct UPDATEs on tenant_id unless bypass is set
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_tenant_id_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_bypass text;
BEGIN
    -- Check if bypass is set (by assign_tenant_to_profile)
    v_bypass := current_setting('app.tenant_assignment_bypass', true);
    IF v_bypass = 'true' THEN
        RETURN NEW;
    END IF;

    -- Block ANY direct UPDATE on tenant_id (fail-loud)
    RAISE EXCEPTION 'tenant_id is immutable: direct updates blocked. Use assign_tenant Edge Function (profile %: % -> %)', OLD.id, OLD.tenant_id, NEW.tenant_id;
END;
$$;

-- ============================================================
-- 3. Attach trigger to profiles.tenant_id
-- ============================================================
DROP TRIGGER IF EXISTS trg_profiles_tenant_id_immutable ON public.profiles;
CREATE TRIGGER trg_profiles_tenant_id_immutable
  BEFORE UPDATE OF tenant_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_id_immutability();

COMMIT;
