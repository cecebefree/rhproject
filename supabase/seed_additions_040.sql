-- 040 booklist fixtures (P2-022)
-- Two tenants for cross-tenant leak tests.
-- Two children in tenant 1 (student1, student2), one child in tenant 2.
-- Book catalog: one per curriculum_type, one ebook, one null isbn (in-house material).
-- Fixtures: yearly item, permanent item, revoked permanent, prior-year item.

-- Second tenant (cross-tenant isolation tests)
insert into public.tenant_devotional (id, name, slug, is_active)
values ('00000000-0000-0000-0000-000000000002', 'Second Devotional', 'second-devotional', true)
on conflict (id) do nothing;

insert into public.tenant_lms (id, name, slug, is_active)
values ('00000000-0000-0000-0000-000000000002', 'Second Tenant', 'second', true)
on conflict (id) do nothing;

insert into public.tenant_mobile (id, name, slug, devotional_enabled, devotional_tenant_id, is_active)
values ('00000000-0000-0000-0000-000000000002', 'Second Tenant', 'second', true,
        '00000000-0000-0000-0000-000000000002', true)
on conflict (id) do nothing;

-- Second tenant user + profile
insert into auth.users (id, email, aud, role)
values ('22222222-2222-2222-2222-222222222222', 'other@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('22222222-2222-2222-2222-222222222222', 'Other Tenant Student', 'student', 'approved', true,
        '00000000-0000-0000-0000-000000000002')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Book catalog fixtures (tenant 1)
insert into public.book (id, tenant_id, title, curriculum_type, isbn_13)
values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Cambridge Math', 'cambridge', '9781107641114'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Reference Bible', 'library', null),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Revoked Dictionary', 'library', '9780198739520'),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Science E-Book', 'ib', '9781108712345')
on conflict (id) do nothing;

insert into public.book (id, tenant_id, title, curriculum_type, isbn_13, ebook_available)
values
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Home School Reader', 'home_school', '9781234567890', true)
on conflict (id) do nothing;

-- Book fixtures (tenant 2)
insert into public.book (id, tenant_id, title, curriculum_type, isbn_13)
values
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
   'Tenant 2 Book', 'library', '9780000000001')
on conflict (id) do nothing;

-- Booklist fixtures for tenant 1, child 1 (student1)
insert into public.booklist (id, tenant_id, child_id, school_year)
values
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '2026-2027'),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e', '2025-2026')
on conflict (tenant_id, child_id, school_year) do nothing;

-- Yearly item (only in 2026-2027)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id)
values ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
        'Cambridge Math', 'course', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Permanent item (survives year roll-over)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, permanent)
values ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
        'Reference Bible', 'course', true)
on conflict (id) do nothing;

-- Revoked permanent item (excluded from bookshelf)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, permanent, revoked_at)
values ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
        'Revoked Dictionary', 'course', true, now())
on conflict (id) do nothing;

-- Prior-year yearly item (2025-2026, not permanent)
insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type, source_id)
values ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
        'Cambridge Math', 'course', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- Booklist for child 2 (student2) — cross-child leak test
insert into public.booklist (id, tenant_id, child_id, school_year)
values ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'bb000000-0000-0000-0000-0000000000b2', '2026-2027')
on conflict (tenant_id, child_id, school_year) do nothing;

insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type)
values ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004',
        'Science E-Book', 'course')
on conflict (id) do nothing;

-- Tenant 2 booklist (cross-tenant leak test)
insert into public.booklist (id, tenant_id, child_id, school_year)
values ('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002',
        '22222222-2222-2222-2222-222222222222', '2026-2027')
on conflict (tenant_id, child_id, school_year) do nothing;

insert into public.booklist_item (id, tenant_id, booklist_id, book_id, title, source_type)
values ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000006',
        'Tenant 2 Book', 'course')
on conflict (id) do nothing;

-- Family member (guardian for student1 and student2)
insert into auth.users (id, email, aud, role)
values ('a0000000-0000-0000-0000-0000000000a1', 'guardian@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('a0000000-0000-0000-0000-0000000000a1', 'Test Guardian', 'family', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;

-- Link guardian to both children
insert into public.family_child (guardian_id, child_id)
values
  ('a0000000-0000-0000-0000-0000000000a1', 'ac87ccc1-2186-4c6b-aeb2-dd966032ee0e'),
  ('a0000000-0000-0000-0000-0000000000a1', 'bb000000-0000-0000-0000-0000000000b2')
on conflict (guardian_id, child_id) do nothing;

-- Second family member (guardian with no links, for family_child leak test)
insert into auth.users (id, email, aud, role)
values ('a0000000-0000-0000-0000-0000000000a2', 'guardian2@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, name, role, registration_status, consent_given, tenant_id)
values ('a0000000-0000-0000-0000-0000000000a2', 'Unlinked Guardian', 'family', 'approved', true,
        '00000000-0000-0000-0000-000000000001')
on conflict (id) do update
  set role = excluded.role,
      registration_status = excluded.registration_status,
      consent_given = excluded.consent_given;
