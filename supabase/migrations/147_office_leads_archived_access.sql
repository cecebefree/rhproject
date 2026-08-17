-- Migration 147: Allow office role to read archived leads (Row 80)
-- Problem: leads_office_select policy has archived_at IS NULL, blocking office
-- from reading leads that were handed off (status='handed_off', archived_at set).
-- Office needs to see these leads because registrations.lead_reference_id points to them.
--
-- Solution: Remove archived_at IS NULL from leads_office_select.
-- Office can already only see their own tenant's data (tenant_id check),
-- so this is safe — they can see all leads in their tenant, archived or not.

-- 1. Drop the existing policy (from migration 109)
DROP POLICY IF EXISTS leads_office_select ON front_desk.leads;

-- 2. Recreate without archived_at IS NULL
CREATE POLICY leads_office_select ON front_desk.leads
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    );

-- 3. Verify: office role can now read archived leads
COMMENT ON POLICY leads_office_select ON front_desk.leads IS
    ' Row 147: Office can read all leads in their tenant (archived included).
     Archived leads are referenced by office_desk.registrations via lead_reference_id.';
