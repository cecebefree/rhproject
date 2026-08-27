import os

content = (
"-- Migration 189: Backfill student_class.status\n"
"-- Ensures all student_class rows have a non-NULL status.\n"
"-- Uses is_active and deleted_at as the source of truth.\n"
"\n"
"BEGIN;\n"
"\n"
"-- 1. Backfill status from is_active + deleted_at\n"
"UPDATE public.student_class\n"
"SET status = CASE\n"
"  WHEN deleted_at IS NOT NULL THEN 'dropped'\n"
"  WHEN is_active = true THEN 'active'\n"
"  WHEN is_active = false THEN 'completed'\n"
"  ELSE 'active'\n"
"END\n"
"WHERE status IS NULL;\n"
"\n"
"-- 2. Make NOT NULL with default\n"
"ALTER TABLE public.student_class\n"
"  ALTER COLUMN status SET DEFAULT 'active';\n"
"\n"
"ALTER TABLE public.student_class\n"
"  ALTER COLUMN status SET NOT NULL;\n"
"\n"
"COMMIT;\n"
)

target = '/Users/ce/dev/rhproject-new/supabase/migrations/189_backfill_student_class_status.sql'
with open(target, 'w') as f:
    f.write(content)
print(f'Written {target}')
