-- 081_fix_release_tenant_guard.sql
-- Security fix: add tenant boundary check to release_report_card.
-- SECURITY DEFINER bypasses RLS, so cross-tenant writes are possible
-- without in-function verification. 065 had only a role check.
-- This migration replaces the function with the same signature.

BEGIN;

create or replace function public.release_report_card(p_card_id uuid)
returns public.report_cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_caller_role       text;
    v_caller_tenant_id  uuid;
    v_report_tenant_id  uuid;
    v_result            public.report_cards;
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

    -- Tenant boundary: SECURITY DEFINER bypasses RLS, so this check
    -- must live in-function. One generic error for both missing and
    -- cross-tenant cards (no existence oracle).
    select tenant_id into v_report_tenant_id
    from public.report_cards
    where id = p_card_id;

    if not found
       or v_report_tenant_id is distinct from v_caller_tenant_id then
        raise exception 'Report card not found or not accessible';
    end if;

    -- Step 1: draft -> released (must match 065 verbatim)
    update public.report_cards
    set status = 'released',
        released_at = now(),
        released_by = auth.uid(),
        updated_at  = now()
    where id = p_card_id
      and status = 'draft';

    if not found then
        raise exception 'Report card not in draft status';
    end if;

    -- Step 2: released -> visible (must match 065 verbatim)
    update public.report_cards
    set status = 'visible',
        visible_at = now(),
        updated_at  = now()
    where id = p_card_id
      and status = 'released';

    select * into v_result from public.report_cards where id = p_card_id;
    return v_result;
end;
$$;

COMMIT;
