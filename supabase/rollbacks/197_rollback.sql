-- ROLLBACK: Migration 197 — family_groups + user_group_members
-- Reverts: drops both tables and all policies/indexes

BEGIN;

DROP TABLE IF EXISTS public.user_group_members CASCADE;
DROP TABLE IF EXISTS public.family_groups CASCADE;

COMMIT;
