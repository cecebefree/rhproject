#!/usr/bin/env python3
target = "/Users/ce/dev/rhproject-new/supabase/migrations/187_schedule_slot_next_class_at.sql"
content = """-- Migration 187: schedule_slot.next_class_at
-- Adds a computed next_class_at column that stores the next future
-- occurrence timestamp. Updated by trigger on INSERT/UPDATE.
-- Uses days_of_week (ISO 1=Mon..7=Sun) + start_time to compute.

BEGIN;

-- 1. Add nullable column
ALTER TABLE public.schedule_slot
  ADD COLUMN IF NOT EXISTS next_class_at timestamptz;

-- 2. Trigger function: compute next_class_at
CREATE OR REPLACE FUNCTION public.compute_next_class_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_now date := current_date;
  v_dow int;
  v_days int[];
  v_next_date date := NULL;
  v_candidate date;
  v_effective_start date;
  v_effective_end date;
  i int;
BEGIN
  IF NOT NEW.is_active THEN
    NEW.next_class_at := NULL;
    RETURN NEW;
  END IF;

  v_effective_start := COALESCE(NEW.start_date,
    (SELECT t.start_date FROM public.terms t WHERE t.id = NEW.term_id));
  v_effective_end := COALESCE(NEW.end_date,
    (SELECT t.end_date FROM public.terms t WHERE t.id = NEW.term_id));

  IF v_effective_start IS NULL OR v_effective_end IS NULL THEN
    NEW.next_class_at := NULL;
    RETURN NEW;
  END IF;

  -- Once: use start_date if in the future
  IF NEW.recurrence = 'once' THEN
    IF NEW.start_date IS NOT NULL AND NEW.start_date >= v_now THEN
      NEW.next_class_at := (NEW.start_date + NEW.start_time)::timestamptz;
    ELSE
      NEW.next_class_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Weekly/biweekly: scan up to 14 days for next matching day-of-week
  v_days := NEW.days_of_week;
  FOR i IN 0..13 LOOP
    v_candidate := v_now + i;
    CONTINUE WHEN v_candidate < v_effective_start;
    CONTINUE WHEN v_candidate > v_effective_end;

    v_dow := EXTRACT(ISODOW FROM v_candidate)::int;

    IF v_dow = ANY(v_days) THEN
      IF NEW.recurrence = 'biweekly' AND (i % 14) != 0 THEN
        CONTINUE;
      END IF;
      v_next_date := v_candidate;
      EXIT;
    END IF;
  END LOOP;

  IF v_next_date IS NOT NULL THEN
    NEW.next_class_at := (v_next_date + NEW.start_time)::timestamptz;
  ELSE
    NEW.next_class_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_compute_next_class_at ON public.schedule_slot;
CREATE TRIGGER trg_compute_next_class_at
  BEFORE INSERT OR UPDATE OF start_time, days_of_week, recurrence,
    start_date, end_date, is_active, term_id
  ON public.schedule_slot
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_next_class_at();

-- 4. Backfill existing rows by touching updated_at
--    (fires trg_schedule_slot_updated_at which calls set_updated_at)
--    The compute_next_class_at trigger fires on the same UPDATE.
UPDATE public.schedule_slot SET updated_at = updated_at;

-- 5. Index for query performance
CREATE INDEX IF NOT EXISTS idx_schedule_slot_next_class_at
  ON public.schedule_slot (next_class_at)
  WHERE next_class_at IS NOT NULL;

COMMIT;
"""
with open(target, "w") as f:
    f.write(content)
print(f"Written {target}")
