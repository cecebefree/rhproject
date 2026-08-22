-- Migration 189: Backfill student_class.status
-- Ensures all student_class rows have a non-NULL status.
-- Uses is_active and deleted_at as the source of truth.

BEGIN;

-- 1. Backfill status from is_active + deleted_at
UPDATE public.student_class
SET status = CASE
  WHEN deleted_at IS NOT NULL THEN 'dropped'
  WHEN is_active = true THEN 'active'
  WHEN is_active = false THEN 'completed'
  ELSE 'active'
END
WHERE status IS NULL;

-- 2. Make NOT NULL with default
ALTER TABLE public.student_class
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.student_class
  ALTER COLUMN status SET NOT NULL;

COMMIT;
