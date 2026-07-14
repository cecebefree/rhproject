-- 048_fix_tenant_id_jwt_path.sql
-- Fixes all admin_all policies to read tenant_id from
-- auth.jwt() -> 'app_metadata' ->> 'tenant_id' instead of
-- the root-level auth.jwt() ->> 'tenant_id'.
--
-- The custom_access_token_hook (022) injects tenant_id into
-- app_metadata. Root-level reads always return NULL.
--
-- PREDECESSOR: 047_consent_guard_and_fixes.sql

-- 042 tables
DROP POLICY IF EXISTS consent_admin_all ON public.consent_records;
CREATE POLICY consent_admin_all ON public.consent_records
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS suppression_admin_all ON public.suppression_records;
CREATE POLICY suppression_admin_all ON public.suppression_records
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 043 tables
DROP POLICY IF EXISTS rc_admin_all ON public.report_cards;
CREATE POLICY rc_admin_all ON public.report_cards
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DROP POLICY IF EXISTS cert_admin_all ON public.certificates;
CREATE POLICY cert_admin_all ON public.certificates
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
