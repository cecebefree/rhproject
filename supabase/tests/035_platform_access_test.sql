-- 035_platform_access_test.sql
begin;
select plan(4);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ac87ccc1-2186-4c6b-aeb2-dd966032ee0e","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);
select ok( public.has_platform_access('core'), 'student1 has core open' );
select ok( public.has_platform_access('enrichment'), 'student1 has enrichment open' );
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"student","tenant_id":"00000000-0000-0000-0000-000000000001"}}', true);
select ok( NOT public.has_platform_access('core'), 'student2 does NOT have core open' );
select ok( public.has_platform_access('enrichment'), 'student2 has enrichment open' );
select * from finish();
rollback;
