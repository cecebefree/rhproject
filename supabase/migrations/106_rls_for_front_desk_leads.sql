-- 065_rls_for_front_desk_leads.sql
-- RLS policies for front_desk.leads (Row 58)
-- Pattern mirrors 044/051/052/053: admin bypass + tenant scoping + role gates
-- PREDECESSOR: 064 (if any) or 105 (latest)

BEGIN;

-- Ensure RLS is enabled on leads
ALTER TABLE front_desk.leads ENABLE ROW LEVEL SECURITY;

-- 1. ADMIN ALL - full access within tenant
-- Mirrors rc_admin_all pattern from 044/053
DROP POLICY IF EXISTS leads_admin_all ON front_desk.leads;
CREATE POLICY leads_admin_all ON front_desk.leads
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

-- 2. FRONT DESK READ - read leads in own tenant
-- Mirrors rc_office_select pattern from 052/053
DROP POLICY IF EXISTS leads_front_desk_select ON front_desk.leads;
CREATE POLICY leads_front_desk_select ON front_desk.leads
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
    );

-- 3. FRONT DESK INSERT - create new leads in own tenant
-- Mirrors consent_self_insert pattern but with role check
DROP POLICY IF EXISTS leads_front_desk_insert ON front_desk.leads;
CREATE POLICY leads_front_desk_insert ON front_desk.leads
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
    );

-- 4. FRONT DESK UPDATE - manage leads (status transitions, callbacks) in own tenant
-- Mirrors rc_office_manage pattern from 051/053
-- Allows status transitions: enquiry -> qualified -> invoiced -> handed_off
DROP POLICY IF EXISTS leads_front_desk_update ON front_desk.leads;
CREATE POLICY leads_front_desk_update ON front_desk.leads
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
        AND status IN ('enquiry', 'qualified', 'invoiced', 'handed_off')
    );

-- 5. OFFICE DESK READ - office can read leads for handoff/reference
-- Mirrors rc_office_select pattern
DROP POLICY IF EXISTS leads_office_select ON front_desk.leads;
CREATE POLICY leads_office_select ON front_desk.leads
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    );

-- 6. OFFICE DESK UPDATE - office can set status to 'handed_off' when payment confirmed
-- Mirrors rc_office_manage pattern with restricted transition
DROP POLICY IF EXISTS leads_office_handoff ON front_desk.leads;
CREATE POLICY leads_office_handoff ON front_desk.leads
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND status IN ('invoiced', 'qualified')
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND status = 'handed_off'
    );

COMMIT;