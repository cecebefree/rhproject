-- 063_family_ledger_report_card_access.sql
-- Family-ledger RLS: family role can SELECT linked children's visible report cards
-- and issued certificates. Uses family_child table (migration 040) for the link.
--
-- PREDECESSOR: 062_handle_system.sql
--
-- Design doc: docs/design/06-family-variant.md (FROZEN ITEM-009)
-- Register: docs/field-register.md (Family-Ledger migration section)
--
-- R22 compliance:
--   Every UPDATE policy below has a paired SELECT policy.
--   Family role is SELECT-only (no INSERT/UPDATE/DELETE per design).
--   Denial tests in 063_family_ledger_test.sql include positive-anchor assertions.

BEGIN;

-- ═══════════════════════════════════════════════
-- 1. RLS — report_cards: rc_family_select
-- Family members see linked children's VISIBLE report cards only.
-- Linkage via family_child table (guardian_id = auth.uid()).
-- SELECT only — no INSERT/UPDATE/DELETE for family role.
-- ═══════════════════════════════════════════════

CREATE POLICY rc_family_select ON public.report_cards
    FOR SELECT TO authenticated
    USING (
        status = 'visible'
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'family'
        )
        AND EXISTS (
            SELECT 1 FROM public.family_child fc
            WHERE fc.guardian_id = auth.uid()
              AND fc.child_id = report_cards.student_id
        )
    );

-- ═══════════════════════════════════════════════
-- 2. RLS — certificates: cert_family_select
-- Family members see linked children's issued certificates.
-- SELECT only — no INSERT/UPDATE/DELETE for family role.
-- ═══════════════════════════════════════════════

CREATE POLICY cert_family_select ON public.certificates
    FOR SELECT TO authenticated
    USING (
        status = 'issued'
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'family'
        )
        AND EXISTS (
            SELECT 1 FROM public.family_child fc
            WHERE fc.guardian_id = auth.uid()
              AND fc.child_id = certificates.user_id
        )
    );

COMMIT;
