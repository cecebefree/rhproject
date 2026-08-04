-- 088_rc_office_insert.sql
-- Corrective: adds rc_office_insert policy so office-role users can CREATE
-- (INSERT) report-card rows per student WITHOUT per-teacher section ownership.
--
-- GAP: Migration 043 created report_cards with only rc_admin_all (FOR ALL,
-- admin-only INSERT). Migration 044 added rc_teacher_insert (FOR INSERT,
-- teacher-only). Migrations 051-053 added office UPDATE (rc_office_manage) and
-- SELECT (rc_office_select) — but NO INSERT policy for office exists in the
-- entire 043→087 chain.
--
-- Per OWNER SCOPE RULING 2 (2026-08-03): report cards are office-loaded per
-- student via Office Desk. Teacher self-service section entry = POST-MVP.
-- The office must be able to INSERT report_cards with status='draft' (pre-
-- release state), without per-teacher section ownership.
--
-- JWT path: uses public.jwt_tenant_id() — canonical helper from 086 that reads
-- app_metadata.tenant_id (set by custom_access_token_hook 022/087). NOT root-level
-- auth.jwt() ->> 'tenant_id' (stripped by GoTrue per 087; re-adding forbidden).
-- See AGENTS.md RLS tenant-scoping gotcha.
--
-- PREDECESSOR: 087_remove_dead_root_claim_emission.sql

BEGIN;

-- Office can INSERT (create) report cards scoped to their tenant.
-- created_by = calling office user; status = 'draft' (pre-release per R18).
-- No per-teacher section ownership check — Ruling 2 defers section-based
-- teacher entry to POST-MVP.
DROP POLICY IF EXISTS rc_office_insert ON public.report_cards;

CREATE POLICY rc_office_insert ON public.report_cards
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = public.jwt_tenant_id()
        AND created_by = auth.uid()
        AND status = 'draft'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    );

COMMIT;
