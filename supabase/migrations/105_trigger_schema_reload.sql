-- PENDING CLEANUP: This migration only contains
-- NOTIFY pgrst, 'reload schema'; and is a workaround for the
-- platform bug tracked in GitHub #45904. Safe to remove once
-- Supabase confirms the PostgREST schema cache issue is resolved.
-- Do not remove until hosted verification confirms all three
-- desk schemas (school_desk, front_desk, office_desk) appear
-- in the REST API output.

-- Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
