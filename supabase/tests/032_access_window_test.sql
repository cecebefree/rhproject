-- 032_access_window_test.sql — verifies has_core_access() and has_item_access()
begin;
select plan(4);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select ok( public.has_core_access(),
  'student1 with has_core=true and live window passes has_core_access' );

select ok( public.has_item_access('11111111-1111-1111-1111-111111111111'),
  'student1 passes has_item_access for their enrolled course 1111' );

select set_config('request.jwt.claims', '{"sub":"bb000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);

select ok( NOT public.has_core_access(),
  'student2 with has_core=false fails has_core_access' );

select ok( NOT public.has_item_access('11111111-1111-1111-1111-111111111111'),
  'student2 fails has_item_access for course 1111 (not enrolled)' );

select * from finish();
rollback;
