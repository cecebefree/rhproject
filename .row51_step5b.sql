-- Test soft-delete: archive the E2E test lead
SELECT archive_lead(
  '2611651a-3f39-4404-a6f4-d5c63ff32840',
  'test_cleanup',
  'testing'::front_desk.archive_reason_type,
  'Row 51 cleanup'
);
