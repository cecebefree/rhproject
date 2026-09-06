-- Fix ambiguous column reference in release_report_card
DROP FUNCTION IF EXISTS public.release_report_card(uuid);

CREATE OR REPLACE FUNCTION public.release_report_card(p_card_id uuid)
RETURNS TABLE(status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, school_desk
AS $function$
DECLARE
    v_caller_role       text;
    v_caller_tenant_id  uuid;
    v_card_tenant_id    uuid;
    v_card_status       text;
BEGIN
    -- Get caller identity
    SELECT role, tenant_id 
    INTO v_caller_role, v_caller_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Caller profile not found';
    END IF;

    IF v_caller_role <> 'office' THEN
        RAISE EXCEPTION 'Only Office Desk can release report cards';
    END IF;

    -- Get card and verify ownership (use qualified column names)
    SELECT rc.tenant_id, rc.status 
    INTO v_card_tenant_id, v_card_status
    FROM school_desk.report_cards rc
    WHERE rc.id = p_card_id;

    IF v_card_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Report card not found';
    END IF;

    IF v_caller_tenant_id IS DISTINCT FROM v_card_tenant_id THEN
        RAISE EXCEPTION 'Report card not found or not accessible';
    END IF;

    -- Transition: draft -> released -> visible
    IF v_card_status = 'draft' THEN
        UPDATE school_desk.report_cards
        SET status = 'released'
        WHERE id = p_card_id;

        UPDATE school_desk.report_cards
        SET status = 'visible'
        WHERE id = p_card_id;
    END IF;

    RETURN QUERY SELECT 'visible'::text;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.release_report_card(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.release_report_card(uuid) TO authenticated;
