-- 089_profiles_curriculum_grade_stage_intake.sql
-- Adds nullable profile enrichment columns for Option A (Ruling: profile fields).
-- Backfills seeded student from SEED_USER values.
--
-- PREDECESSOR: 088_rc_office_insert.sql

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS curriculum text,
  ADD COLUMN IF NOT EXISTS grade      text,
  ADD COLUMN IF NOT EXISTS stage      text,
  ADD COLUMN IF NOT EXISTS intake     text;

COMMENT ON COLUMN public.profiles.curriculum IS 'Curriculum framework (e.g. Cambridge, IB)';
COMMENT ON COLUMN public.profiles.grade IS 'Academic year/grade level (e.g. 8)';
COMMENT ON COLUMN public.profiles.stage IS 'School stage (e.g. Mid School, Senior School)';
COMMENT ON COLUMN public.profiles.intake IS 'Student intake group (e.g. Group A · Jan)';

-- Backfill seeded student profile (R18 demo: Liam van der Berg).
-- Idempotent: only fills NULLs for the Redhouse tenant student.
-- Trigger 057 only fires on tenant_id UPDATE — these columns are safe.
UPDATE public.profiles
  SET curriculum = 'Cambridge',
      grade      = '8',
      stage      = 'Mid School',
      intake     = 'Group A · Jan'
WHERE role = 'student'
  AND tenant_id = 'e97e5c3a-1234-4321-abcd-000000000001'
  AND (curriculum IS NULL OR grade IS NULL OR stage IS NULL OR intake IS NULL);

COMMIT;
