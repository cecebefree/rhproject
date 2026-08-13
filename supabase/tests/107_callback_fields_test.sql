-- 107_callback_fields_test.sql
-- Row 64: Verify callback scheduling fields exist and work correctly.

BEGIN;
SELECT plan(6);

-- 1. Verify callback_scheduled_at column exists
SELECT has_column(
  'front_desk', 'leads', 'callback_scheduled_at',
  'leads has callback_scheduled_at column'
);

-- 2. Verify callback_status column exists
SELECT has_column(
  'front_desk', 'leads', 'callback_status',
  'leads has callback_status column'
);

-- 3. Verify callback_notes column exists
SELECT has_column(
  'front_desk', 'leads', 'callback_notes',
  'leads has callback_notes column'
);

-- 4. Verify callback_status enum type exists
SELECT has_type(
  'front_desk', 'callback_status_type',
  'callback_status_type enum exists in front_desk schema'
);

-- 5. Verify enum values are correct
SELECT results_eq(
  $$SELECT unnest(enum_range(NULL::front_desk.callback_status_type))::text$$,
  $$VALUES ('pending'), ('completed'), ('cancelled')$$,
  'callback_status_type has correct enum values'
);

-- 6. Insert a lead with callback fields populated (service_role bypasses RLS)
SET ROLE service_role;
SELECT lives_ok(
  $$INSERT INTO front_desk.leads (tenant_id, name, email, callback_scheduled_at, callback_status, callback_notes)
    VALUES ((SELECT id FROM public.tenant_devotional LIMIT 1), 'Callback Test', 'callback@test.com',
            now() + interval '1 day', 'pending', 'Call back tomorrow morning')$$,
  'service_role can INSERT lead with callback fields'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
