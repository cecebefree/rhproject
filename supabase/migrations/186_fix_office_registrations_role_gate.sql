-- Migration 186: Fix registrations role gate
-- Per FIXES doc HIGH #7: Add role check to prevent student/teacher/parent access

DROP POLICY IF EXISTS office_registrations_tenant_select ON office_desk.registrations;

CREATE POLICY office_registrations_tenant_select ON office_desk.registrations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Admin can see all
      EXISTS(
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.raw_user_meta_data->>'role' = 'admin'
      )
      -- Tenant staff can see their registrations
      OR tenant_id = (
        SELECT tenant_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );
