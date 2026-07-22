-- 065_r18_rpc_report_cards.sql
-- R18 hybrid live write->release cycle (Row 27)
-- Local RPC shims, replaced by Edge Functions post-deploy (row 27b).
--
-- PREDECESSOR: 064_role_mismatch_rc_policy.sql

BEGIN;

-- create_draft_report_card: teacher drafts a new report card
-- Returns the created row. SECURITY DEFINER bypasses RLS; role is
-- checked explicitly.
create or replace function public.create_draft_report_card(
    p_student_id uuid,
    p_term       text,
    p_subject    text,
    p_grade      text default null
)
returns public.report_cards
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tenant_id uuid;
    v_result    public.report_cards;
begin
    -- Caller must be a teacher
    if not exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role = 'teacher'
    ) then
        raise exception 'Only teachers can create draft report cards'
            using hint = 'caller must have role=teacher in profiles';
    end if;

    -- Derive tenant from caller's profile
    select tenant_id into strict v_tenant_id
    from public.profiles
    where id = auth.uid();

    insert into public.report_cards
        (student_id, term, subject, grade, status, created_by, tenant_id)
    values
        (p_student_id, p_term, p_subject, p_grade, 'draft', auth.uid(), v_tenant_id)
    returning * into v_result;

    return v_result;
end;
$$;

-- release_report_card: office transitions draft -> visible in one tx
-- Sets released_at + released_by for audit trail.
-- Rejects non-office callers per ITEM-004 §2.
create or replace function public.release_report_card(
    p_card_id uuid
)
returns public.report_cards
language plpgsql
security definer
set search_path = public
as $$
declare
    v_result public.report_cards;
begin
    -- Caller must be office desk
    if not exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role = 'office'
    ) then
        raise exception 'Only Office Desk can release report cards'
            using hint = 'caller must have role=office in profiles';
    end if;

    update public.report_cards
    set status = 'visible',
        released_at = now(),
        released_by = auth.uid(),
        updated_at  = now()
    where id = p_card_id
      and status = 'draft'
    returning * into v_result;

    if not found then
        raise exception 'Report card not found or not in draft status'
            using hint = format('card_id=%s, status must be draft', p_card_id);
    end if;

    return v_result;
end;
$$;

-- Grant execution to authenticated (role check is inside the function)
grant execute on function public.create_draft_report_card to authenticated;
grant execute on function public.release_report_card to authenticated;

COMMIT;
