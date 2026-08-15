-- Migration 113: Fix school_desk table grants for service_role
-- After migration 102 moved tables to school_desk schema, the grants
-- from migration 066 (on public.courses) no longer apply.
-- service_role needs full access to school_desk tables for test fixtures.

BEGIN;

-- Grant service_role full access to school_desk tables
GRANT ALL ON school_desk.courses TO service_role;
GRANT ALL ON school_desk.enrollments TO service_role;
GRANT ALL ON school_desk.report_cards TO service_role;
GRANT ALL ON school_desk.announcement TO service_role;
GRANT ALL ON school_desk.conversations TO service_role;
GRANT ALL ON school_desk.conversation_members TO service_role;
GRANT ALL ON school_desk.messages TO service_role;

-- Grant service_role full access to public.chapters (for test fixtures)
GRANT ALL ON public.chapters TO service_role;

-- Grant service_role full access to office_desk tables (for test fixtures)
GRANT ALL ON office_desk.registrations TO service_role;
GRANT ALL ON office_desk.invoices TO service_role;
GRANT ALL ON office_desk.payments TO service_role;

-- Grant authenticated SELECT on school_desk.courses (for RLS tests)
GRANT SELECT ON school_desk.courses TO authenticated;

-- Grant authenticated SELECT on school_desk.enrollments (for RLS tests)
GRANT SELECT ON school_desk.enrollments TO authenticated;

-- Grant authenticated SELECT on office_desk tables (for RLS tests)
GRANT SELECT ON office_desk.registrations TO authenticated;
GRANT SELECT ON office_desk.invoices TO authenticated;
GRANT SELECT ON office_desk.payments TO authenticated;

COMMIT;
