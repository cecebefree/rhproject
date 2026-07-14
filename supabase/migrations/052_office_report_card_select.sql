-- 052_office_report_card_select.sql
-- Adds a SELECT policy for office on report_cards.
--
-- WHY: PostgreSQL 17 requires a SELECT policy on a table for the
-- read-phase of UPDATE to see rows. Without this, rc_office_manage
-- silently updates 0 rows (One-Time Filter: false in EXPLAIN ANALYZE).
--
-- PREDECESSOR: 051_office_report_card_lifecycle.sql

CREATE POLICY rc_office_select ON public.report_cards
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    );
