-- Migration 118: Add school_desk SELECT policy for registrations
-- School Desk (teachers) need to read registrations to manage intake
-- Pattern: role gate + tenant scope + soft-delete filter

BEGIN;

-- School Desk can read registrations in their tenant
DROP POLICY IF EXISTS school_desk_registrations_select ON office_desk.registrations;
CREATE POLICY school_desk_registrations_select ON office_desk.registrations
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

COMMENT ON POLICY school_desk_registrations_select ON office_desk.registrations IS
  'Row 67: Teachers can read registrations in their own tenant (soft-delete filtered)';

COMMIT;
