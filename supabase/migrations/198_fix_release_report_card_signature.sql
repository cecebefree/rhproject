-- Drop old signature
DROP FUNCTION IF EXISTS public.release_report_card(uuid);

-- Recreate with correct signature
CREATE OR REPLACE FUNCTION public.release_report_card(p_tenant_id uuid)
RETURNS TABLE(status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_caller_role       text;
    v_caller_tenant_id  uuid;
    v_count             integer;
begin
    select role, tenant_id into v_caller_role, v_caller_tenant_id
    from public.profiles
    where id = auth.uid();

    if not found then
        raise exception 'Caller profile not found';
    end if;

    if v_caller_role <> 'office' then
        raise exception 'Only Office Desk can release report cards';
    end if;

    if v_caller_tenant_id is distinct from p_tenant_id then
        raise exception 'Report card not found or not accessible';
    end if;

    UPDATE school_desk.report_cards
    SET status = 'visible'
    WHERE school_desk.report_cards.tenant_id = p_tenant_id AND school_desk.report_cards.status = 'draft';

    return query select 'visible'::text;
end;
$function$;

-- Add missing test helper
CREATE OR REPLACE FUNCTION is_rls_enabled(p_schema name, p_table name, p_type text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
declare
    v_rls_enabled boolean;
begin
    SELECT (row_security_enabled(to_regclass(p_schema || '.' || p_table)))
    INTO v_rls_enabled;
    return coalesce(v_rls_enabled, false);
end;
$function$;
