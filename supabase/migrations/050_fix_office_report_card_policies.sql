-- 050_fix_office_report_card_policies.sql
-- Fixes rc_office_visible and rc_office_release so office
-- cannot skip draft->visible. Each policy now checks the
-- current status in its USING clause:
--   rc_office_release:  status = 'draft'   (draft -> released)
--   rc_office_visible:  status = 'released' (released -> visible)
--
-- PREDECESSOR: 049_fix_cert_trigger_no_hstore.sql

DROP POLICY IF EXISTS rc_office_release ON public.report_cards;
CREATE POLICY rc_office_release ON public.report_cards
    FOR UPDATE TO authenticated
    USING (
        status = 'draft'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND status = 'released'
        AND released_by = auth.uid()
        AND released_at IS NOT NULL
    );

DROP POLICY IF EXISTS rc_office_visible ON public.report_cards;
CREATE POLICY rc_office_visible ON public.report_cards
    FOR UPDATE TO authenticated
    USING (
        status = 'released'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND status = 'visible'
        AND visible_at IS NOT NULL
    );
