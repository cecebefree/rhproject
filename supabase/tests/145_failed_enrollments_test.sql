BEGIN;
  SELECT plan(12);

  -- Table exists
  SELECT has_table('office_desk'::name, 'failed_enrollments'::name, 'Table office_desk.failed_enrollments exists');

  -- RLS enabled
  SELECT ok(is_rls_enabled('office_desk'::name, 'failed_enrollments'::name, 'RLS is enabled on failed_enrollments'::text), 'RLS is enabled on failed_enrollments');

  -- Required columns exist
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'id'::name, 'Column id exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'tenant_id'::name, 'Column tenant_id exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'registration_attempt'::name, 'Column registration_attempt exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'payment_attempt'::name, 'Column payment_attempt exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'error_code'::name, 'Column error_code exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'error_message'::name, 'Column error_message exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'resolved'::name, 'Column resolved exists');
  SELECT has_column('office_desk'::name, 'failed_enrollments'::name, 'created_at'::name, 'Column created_at exists');

  -- Column types
  SELECT col_type_is('office_desk'::name, 'failed_enrollments'::name, 'registration_attempt'::name, 'jsonb'::name);
  SELECT col_type_is('office_desk'::name, 'failed_enrollments'::name, 'resolved'::name, 'boolean'::name);

  SELECT * FROM finish();
ROLLBACK;
