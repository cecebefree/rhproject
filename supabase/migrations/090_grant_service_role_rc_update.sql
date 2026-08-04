-- 090_grant_service_role_rc_update.sql
-- Add the missing service_role UPDATE grant on report_cards.
--
-- GAP (root cause, found 2026-08-04): migration 066_restore_service_role_grants.sql
-- commented "report_cards: SELECT/INSERT (release-report-card EF)" but granted only
-- SELECT, INSERT — never UPDATE. The release-report-card Edge Function performs
-- status transitions (draft -> released -> visible) via its service_role client,
-- so every write returned 500 ("permission denied for table report_cards").
-- Row 38 step e previously "passed" only because it was a simulated direct UPDATE
-- as table owner, not an actual EF call.
--
-- 066 is left untouched (per governance, do not rewrite sealed migrations). This
-- migration closes the gap minimally: exactly one table, exactly one privilege.
--
-- NOTE: numbering — the AO-004 direction named this "067", but 067_admin_tenant_scope.sql
-- already exists; the next free sequence number is 090.

GRANT UPDATE ON public.report_cards TO service_role;
