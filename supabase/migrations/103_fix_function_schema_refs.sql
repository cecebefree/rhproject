-- Migration 103: Fix hardcoded public. references in 4 function bodies (Row 55)
-- get_announcements(): public.announcement → school_desk.announcement
-- create_draft_report_card(): public.report_cards → school_desk.report_cards
-- release_report_card(): public.report_cards → school_desk.report_cards
-- chapters_read(): public.courses → school_desk.courses (chapters stays in public)

BEGIN;

-- 1. get_announcements() — fix table reference
CREATE OR REPLACE FUNCTION public.get_announcements()
RETURNS TABLE(
  id uuid, tenant_id uuid, title text, body text,
  audience_roles text[], publish_at timestamptz,
  expires_at timestamptz, pinned boolean, created_by uuid, created_at timestamptz
)
  LANGUAGE sql STABLE
  SET search_path TO 'public'
AS $function$
  select a.id, a.tenant_id, a.title, a.body, a.audience_roles,
         a.publish_at, a.expires_at, a.pinned, a.created_by, a.created_at
  from school_desk.announcement a
  where a.tenant_id = jwt_tenant_id()
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      or (
        a.publish_at <= now()
        and (a.expires_at is null or a.expires_at > now())
        and (
          a.audience_roles = '{}'
          or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = any(a.audience_roles))
        )
      )
    )
  order by a.pinned desc, a.publish_at desc;
$function$;

-- 2. create_draft_report_card() — fix table references
CREATE OR REPLACE FUNCTION public.create_draft_report_card(
  p_student_id uuid, p_term text, p_subject text, p_grade text DEFAULT NULL
)
RETURNS school_desk.report_cards
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_tenant_id uuid;
    v_result    school_desk.report_cards;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'office'
    ) THEN
        RAISE EXCEPTION 'Only office desk can create draft report cards'
            USING HINT = 'caller must have role=office in profiles';
    END IF;

    SELECT tenant_id INTO STRICT v_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();

    INSERT INTO school_desk.report_cards
        (student_id, term, subject, grade, status, created_by, tenant_id)
    VALUES
        (p_student_id, p_term, p_subject, p_grade, 'draft', auth.uid(), v_tenant_id)
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$function$;

-- 3. release_report_card() — fix table references
CREATE OR REPLACE FUNCTION public.release_report_card(p_card_id uuid)
RETURNS school_desk.report_cards
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_caller_role       text;
    v_caller_tenant_id  uuid;
    v_report_tenant_id  uuid;
    v_result            school_desk.report_cards;
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

    select tenant_id into v_report_tenant_id
    from school_desk.report_cards
    where id = p_card_id;

    if not found
       or v_report_tenant_id is distinct from v_caller_tenant_id then
        raise exception 'Report card not found or not accessible';
    end if;

    update school_desk.report_cards
    set status = 'released',
        released_at = now(),
        released_by = auth.uid(),
        updated_at  = now()
    where id = p_card_id
      and status = 'draft';

    if not found then
        raise exception 'Report card not in draft status';
    end if;

    update school_desk.report_cards
    set status = 'visible',
        visible_at = now(),
        updated_at  = now()
    where id = p_card_id
      and status = 'released';

    select * into v_result from school_desk.report_cards where id = p_card_id;
    return v_result;
end;
$function$;

-- 4. chapters_read() — fix courses reference (chapters stays in public)
CREATE OR REPLACE FUNCTION public.chapters_read(p_course_id uuid)
RETURNS SETOF chapters
  LANGUAGE sql STABLE
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT ch.*
  FROM public.chapters ch
  JOIN school_desk.courses co ON co.id = ch.course_id
  WHERE ch.course_id = p_course_id
    AND (
      NOT EXISTS (SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role = 'outside_student')
      OR co.type = 'enrichment'
    )
    AND (
      ( co.status = 'published'
        AND ( public.has_item_access(p_course_id)
              OR (co.type = 'core' AND public.has_core_access()) ) )
      OR ( co.status = 'published'
           AND co.type = 'enrichment'
           AND EXISTS (SELECT 1 FROM public.profiles p
                       WHERE p.id = auth.uid() AND p.role = 'outside_student') )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.id = co.teacher_id
          AND p.role IN ('teacher','admin') )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin' )
    )
  ORDER BY ch.order_index;
$function$;

COMMIT;
