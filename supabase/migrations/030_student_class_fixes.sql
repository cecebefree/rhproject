-- 028_student_class_fixes.sql
-- Close P2-011 Council gaps: FK, teacher policy, tenant default, soft-delete/retention

-- 1. FK on class_id -> courses(id)
alter table student_class
  add constraint student_class_class_id_fkey
  foreign key (class_id) references public.courses(id);

-- 2. Drop hardcoded tenant_id default
alter table student_class
  alter column tenant_id drop default;

-- 3. Add soft-delete active flag + retention window
alter table student_class
  add column if not exists is_active boolean not null default true,
  add column if not exists retention_until timestamptz;

-- 4. Teacher read policy: teacher sees rows for classes they own
create policy sc_teacher_read on student_class
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = student_class.class_id
        and c.teacher_id = auth.uid()
    )
  );
