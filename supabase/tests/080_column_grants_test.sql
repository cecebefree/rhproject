-- 080_column_grants_test.sql: verify column-scoped UPDATE per row 54 spec
-- Uses has_column_privilege() to check granted/blocked columns

BEGIN;

SELECT plan(42);

-- report_cards: privileged columns ARE granted (office runs as authenticated PG role;
-- RLS rc_office_release enforces the row-level gate)
SELECT is(
  has_column_privilege('authenticated', 'public.report_cards', 'status', 'UPDATE'),
  true,
  'report_cards: authenticated CAN UPDATE status (RLS gates office-only)'
);
SELECT is(
  has_column_privilege('authenticated', 'public.report_cards', 'released_at', 'UPDATE'),
  true,
  'report_cards: authenticated CAN UPDATE released_at (RLS gates office-only)'
);
SELECT is(
  has_column_privilege('authenticated', 'public.report_cards', 'released_by', 'UPDATE'),
  true,
  'report_cards: authenticated CAN UPDATE released_by (RLS gates office-only)'
);
SELECT is(
  has_column_privilege('authenticated', 'public.report_cards', 'grade', 'UPDATE'),
  true,
  'report_cards: authenticated can UPDATE grade'
);

-- messages: sender_id, conversation_id, created_at blocked
SELECT is(
  has_column_privilege('authenticated', 'public.messages', 'sender_id', 'UPDATE'),
  false,
  'messages: authenticated cannot UPDATE sender_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.messages', 'conversation_id', 'UPDATE'),
  false,
  'messages: authenticated cannot UPDATE conversation_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.messages', 'created_at', 'UPDATE'),
  false,
  'messages: authenticated cannot UPDATE created_at'
);
SELECT is(
  has_column_privilege('authenticated', 'public.messages', 'body', 'UPDATE'),
  true,
  'messages: authenticated can UPDATE body'
);

-- consent_records: given_at, ip_address blocked
SELECT is(
  has_column_privilege('authenticated', 'public.consent_records', 'given_at', 'UPDATE'),
  false,
  'consent_records: authenticated cannot UPDATE given_at'
);
SELECT is(
  has_column_privilege('authenticated', 'public.consent_records', 'ip_address', 'UPDATE'),
  false,
  'consent_records: authenticated cannot UPDATE ip_address'
);
SELECT is(
  has_column_privilege('authenticated', 'public.consent_records', 'consent_given', 'UPDATE'),
  true,
  'consent_records: authenticated can UPDATE consent_given'
);

-- announcement: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.announcement', 'tenant_id', 'UPDATE'),
  false,
  'announcement: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.announcement', 'title', 'UPDATE'),
  true,
  'announcement: authenticated can UPDATE title'
);
SELECT is(
  has_column_privilege('authenticated', 'public.announcement', 'body', 'UPDATE'),
  true,
  'announcement: authenticated can UPDATE body'
);

-- book: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.book', 'tenant_id', 'UPDATE'),
  false,
  'book: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.book', 'title', 'UPDATE'),
  true,
  'book: authenticated can UPDATE title'
);

-- booklist: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.booklist', 'tenant_id', 'UPDATE'),
  false,
  'booklist: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.booklist', 'child_id', 'UPDATE'),
  true,
  'booklist: authenticated can UPDATE child_id'
);

-- booklist_item: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.booklist_item', 'tenant_id', 'UPDATE'),
  false,
  'booklist_item: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.booklist_item', 'title', 'UPDATE'),
  true,
  'booklist_item: authenticated can UPDATE title'
);

-- conversations: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.conversations', 'tenant_id', 'UPDATE'),
  false,
  'conversations: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.conversations', 'category', 'UPDATE'),
  true,
  'conversations: authenticated can UPDATE category'
);

-- enrichment_meta: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.enrichment_meta', 'tenant_id', 'UPDATE'),
  false,
  'enrichment_meta: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.enrichment_meta', 'pace', 'UPDATE'),
  true,
  'enrichment_meta: authenticated can UPDATE pace'
);

-- schedule_slot: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.schedule_slot', 'tenant_id', 'UPDATE'),
  false,
  'schedule_slot: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.schedule_slot', 'label', 'UPDATE'),
  true,
  'schedule_slot: authenticated can UPDATE label'
);

-- suppression_records: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.suppression_records', 'tenant_id', 'UPDATE'),
  false,
  'suppression_records: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.suppression_records', 'reason', 'UPDATE'),
  true,
  'suppression_records: authenticated can UPDATE reason'
);

-- terms: tenant_id blocked, other cols granted
SELECT is(
  has_column_privilege('authenticated', 'public.terms', 'tenant_id', 'UPDATE'),
  false,
  'terms: authenticated cannot UPDATE tenant_id'
);
SELECT is(
  has_column_privilege('authenticated', 'public.terms', 'name', 'UPDATE'),
  true,
  'terms: authenticated can UPDATE name'
);

-- For tenant_id tables without privileged columns, verify no table-level UPDATE
-- (column-scoped grant means table-level should be revoked)
SELECT is(
  has_table_privilege('authenticated', 'public.announcement', 'UPDATE'),
  false,
  'announcement: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.book', 'UPDATE'),
  false,
  'book: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.booklist', 'UPDATE'),
  false,
  'booklist: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.booklist_item', 'UPDATE'),
  false,
  'booklist_item: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.conversations', 'UPDATE'),
  false,
  'conversations: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.enrichment_meta', 'UPDATE'),
  false,
  'enrichment_meta: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.schedule_slot', 'UPDATE'),
  false,
  'schedule_slot: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.suppression_records', 'UPDATE'),
  false,
  'suppression_records: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.terms', 'UPDATE'),
  false,
  'terms: no table-level UPDATE for authenticated'
);

SELECT is(
  has_table_privilege('authenticated', 'public.report_cards', 'UPDATE'),
  false,
  'report_cards: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.messages', 'UPDATE'),
  false,
  'messages: no table-level UPDATE for authenticated'
);
SELECT is(
  has_table_privilege('authenticated', 'public.consent_records', 'UPDATE'),
  false,
  'consent_records: no table-level UPDATE for authenticated'
);

END;
