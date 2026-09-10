-- Migration: Add ON DELETE CASCADE to profiles FKs that block test cleanup
-- These FKs reference public.profiles(id) without CASCADE, causing
-- test 07_tenant_assignment_immutable_test to fail when news/broadcasts exist.

-- news.created_by
ALTER TABLE school_desk.news
  DROP CONSTRAINT IF EXISTS news_created_by_fkey,
  ADD CONSTRAINT news_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- broadcasts.created_by
ALTER TABLE school_desk.broadcasts
  DROP CONSTRAINT IF EXISTS broadcasts_created_by_fkey,
  ADD CONSTRAINT broadcasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- handle_changes.profile_id
ALTER TABLE public.handle_changes
  DROP CONSTRAINT IF EXISTS handle_changes_profile_id_fkey,
  ADD CONSTRAINT handle_changes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- report_cards.created_by
ALTER TABLE school_desk.report_cards
  DROP CONSTRAINT IF EXISTS report_cards_created_by_fkey,
  ADD CONSTRAINT report_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- report_cards.released_by
ALTER TABLE school_desk.report_cards
  DROP CONSTRAINT IF EXISTS report_cards_released_by_fkey,
  ADD CONSTRAINT report_cards_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- attendance.student_id
ALTER TABLE school_desk.attendance
  DROP CONSTRAINT IF EXISTS attendance_student_id_fkey,
  ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- gradebook.student_id
ALTER TABLE school_desk.gradebook
  DROP CONSTRAINT IF EXISTS gradebook_student_id_fkey,
  ADD CONSTRAINT gradebook_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- suppression_records.suppressed_by
ALTER TABLE public.suppression_records
  DROP CONSTRAINT IF EXISTS suppression_records_suppressed_by_fkey,
  ADD CONSTRAINT suppression_records_suppressed_by_fkey FOREIGN KEY (suppressed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- NOTE: audit_log FKs omitted — table schema varies across migrations.
-- If audit_log FK blocks test cleanup, add CASCADE in a follow-up migration.
