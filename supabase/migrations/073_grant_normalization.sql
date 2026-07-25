-- ITEM-55: Column-grant narrowing — restrict UPDATE on privileged columns for authenticated.
-- ITEM-57: Grant normalization — service_role gets full CRUD on enrollments;
--           revoke TRUNCATE/REFERENCES/TRIGGER from service_role on enrollments + chapter_progress.
-- Precedent: 069 (grant sweep), 070 (DELETE revocation).

-- === ITEM-57 ===
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO service_role;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.enrollments FROM service_role;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.chapter_progress FROM service_role;

-- === ITEM-55 (12 tables) ===

-- Three named tables: restrict UPDATE to ruled permitted-list
REVOKE UPDATE ON public.report_cards FROM authenticated;
GRANT UPDATE (status, released_at, released_by) ON public.report_cards TO authenticated;

REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (sender_id, conversation_id, created_at) ON public.messages TO authenticated;

REVOKE UPDATE ON public.consent_records FROM authenticated;
GRANT UPDATE (given_at, ip_address) ON public.consent_records TO authenticated;

-- tenant_id set (9 tables): restrict UPDATE excluding tenant_id
REVOKE UPDATE ON public.announcement FROM authenticated;
GRANT UPDATE (title, body, audience_roles, publish_at, expires_at, pinned, created_by, created_at, updated_at) ON public.announcement TO authenticated;

REVOKE UPDATE ON public.book FROM authenticated;
GRANT UPDATE (title, cover_image_url, curriculum_type, isbn_13, ebook_available, ebook_storage_path, created_at, updated_at) ON public.book TO authenticated;

REVOKE UPDATE ON public.booklist FROM authenticated;
GRANT UPDATE (child_id, school_year, created_at) ON public.booklist TO authenticated;

REVOKE UPDATE ON public.booklist_item FROM authenticated;
GRANT UPDATE (booklist_id, book_id, title, isbn, source_type, source_id, permanent, revoked_at, created_at, updated_at) ON public.booklist_item TO authenticated;

REVOKE UPDATE ON public.conversations FROM authenticated;
GRANT UPDATE (category, created_by, created_at, updated_at) ON public.conversations TO authenticated;

REVOKE UPDATE ON public.enrichment_meta FROM authenticated;
GRANT UPDATE (student_class_id, pace, completed, total, note, created_at, updated_at) ON public.enrichment_meta TO authenticated;

REVOKE UPDATE ON public.schedule_slot FROM authenticated;
GRANT UPDATE (course_id, term_id, label, start_time, end_time, days_of_week, recurrence, start_date, end_date, is_active, created_at, updated_at) ON public.schedule_slot TO authenticated;

REVOKE UPDATE ON public.suppression_records FROM authenticated;
GRANT UPDATE (profile_id, suppressed_by, reason, suppression_type, suppressed_at, created_at) ON public.suppression_records TO authenticated;

REVOKE UPDATE ON public.terms FROM authenticated;
GRANT UPDATE (name, start_date, end_date, is_active, created_at, updated_at) ON public.terms TO authenticated;
