create table if not exists student_class (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id),
  class_id uuid not null,
  tenant_id uuid not null default '00000000-0000-0000-0000-000000000001',
  enrolled_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (student_id, class_id)
);
alter table student_class enable row level security;
create policy sc_student_read on student_class
  for select using (student_id = auth.uid());
create policy sc_admin_all on student_class
  for all using (
    exists (select 1 from profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );
