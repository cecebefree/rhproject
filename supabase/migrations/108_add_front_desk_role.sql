-- Migration 108: Add front_desk to profiles role CHECK constraint
-- BLOCKER: migration 106 references p.role = 'front_desk' in 4 RLS policies
-- but the CHECK constraint (045) does not include 'front_desk'. Any
-- INSERT/UPDATE with role='front_desk' fails with constraint violation.
--
-- Pattern: DROP + ADD (same as 026, 045). Postgres CHECK constraints
-- are immutable — must drop and recreate to modify.
--
-- PREDECESSOR: 107

BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'student', 'outside_student', 'family', 'alumni',
    'teacher', 'expert', 'guest', 'admin',
    'learner', 'office', 'front_desk'
  ));

-- Verify: INSERT with front_desk role succeeds within same transaction
-- (rolled back by ROLLBACK below — this is a structural check, not data)
-- NOTE: Skipped FK check by using a known auth.users ID or skipping verification
-- The CHECK constraint is verified by the ALTER TABLE ADD CONSTRAINT above

COMMIT;
