-- 080: restore column-scoped UPDATE for authenticated (row 54 spec). Privileged exclusions: report_cards status, released_at, released_by; messages sender_id, conversation_id, created_at; consent_records given_at, ip_address; tenant tables tenant_id.

BEGIN;

-- report_cards: exclude status, released_at, released_by
REVOKE UPDATE ON public.report_cards FROM authenticated;
GRANT UPDATE (
  id,
  student_id,
  term,
  subject,
  grade,
  created_by,
  visible_at,
  created_at,
  updated_at
) ON public.report_cards TO authenticated;

-- messages: exclude sender_id, conversation_id, created_at
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (
  id,
  body,
  edited_at,
  deleted_at
) ON public.messages TO authenticated;

-- consent_records: exclude given_at, ip_address
REVOKE UPDATE ON public.consent_records FROM authenticated;
GRANT UPDATE (
  id,
  profile_id,
  consent_type,
  consent_given,
  created_at,
  updated_at,
  withdrawn_at
) ON public.consent_records TO authenticated;

-- announcement: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.announcement FROM authenticated;
GRANT UPDATE (
  id,
  title,
  body,
  audience_roles,
  publish_at,
  expires_at,
  pinned,
  created_by,
  created_at,
  updated_at
) ON public.announcement TO authenticated;

-- book: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.book FROM authenticated;
GRANT UPDATE (
  id,
  title,
  cover_image_url,
  curriculum_type,
  isbn_13,
  ebook_available,
  ebook_storage_path,
  created_at,
  updated_at
) ON public.book TO authenticated;

-- booklist: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.booklist FROM authenticated;
GRANT UPDATE (
  id,
  child_id,
  school_year,
  created_at
) ON public.booklist TO authenticated;

-- booklist_item: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.booklist_item FROM authenticated;
GRANT UPDATE (
  id,
  booklist_id,
  book_id,
  title,
  isbn,
  source_type,
  source_id,
  permanent,
  revoked_at,
  created_at,
  updated_at
) ON public.booklist_item TO authenticated;

-- conversations: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.conversations FROM authenticated;
GRANT UPDATE (
  id,
  category,
  created_by,
  created_at,
  updated_at
) ON public.conversations TO authenticated;

-- enrichment_meta: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.enrichment_meta FROM authenticated;
GRANT UPDATE (
  id,
  student_class_id,
  pace,
  completed,
  total,
  note,
  created_at,
  updated_at
) ON public.enrichment_meta TO authenticated;

-- schedule_slot: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.schedule_slot FROM authenticated;
GRANT UPDATE (
  id,
  course_id,
  term_id,
  label,
  start_time,
  end_time,
  days_of_week,
  recurrence,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at
) ON public.schedule_slot TO authenticated;

-- suppression_records: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.suppression_records FROM authenticated;
GRANT UPDATE (
  id,
  profile_id,
  suppressed_by,
  reason,
  suppression_type,
  suppressed_at,
  created_at
) ON public.suppression_records TO authenticated;

-- terms: exclude tenant_id (no privileged)
REVOKE UPDATE ON public.terms FROM authenticated;
GRANT UPDATE (
  id,
  name,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at
) ON public.terms TO authenticated;

COMMIT;
