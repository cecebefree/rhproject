-- Migration 162: Grant service_role access to Front Desk tables
-- Fixes permission denied for service_role queries

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON front_desk.inquiries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON front_desk.activity_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON front_desk.communication_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO service_role;

COMMIT;
