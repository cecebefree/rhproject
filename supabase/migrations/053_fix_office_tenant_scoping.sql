-- 053_fix_office_tenant_scoping.sql
-- SECURITY DEFECT: rc_office_select (052) and rc_office_manage (051)
-- lacked tenant_id scoping. Office user in tenant A could SELECT and
-- UPDATE report_cards belonging to tenant B.
--
-- FIX: Add JWT tenant_id clause to both policies, matching the
-- admin_all pattern: tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
--
-- PREDECESSOR: 052_office_report_card_select.sql

DROP POLICY IF EXISTS rc_office_select ON public.report_cards;
CREATE POLICY rc_office_select ON public.report_cards
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    );

DROP POLICY IF EXISTS rc_office_manage ON public.report_cards;
CREATE POLICY rc_office_manage ON public.report_cards
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
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
        AND (
            (status = 'released' AND released_by = auth.uid() AND released_at IS NOT NULL)
            OR
            (status = 'visible' AND visible_at IS NOT NULL)
        )
    );
