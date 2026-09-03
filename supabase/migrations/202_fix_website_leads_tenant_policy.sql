DROP POLICY IF EXISTS "website_leads_tenant_isolation" ON public.website_leads;

CREATE POLICY "website_leads_tenant_isolation"
  ON public.website_leads
  FOR SELECT
  TO authenticated
  USING (
    tenant = (auth.jwt() ->> 'tenant_id')
    OR current_user = 'service_role'
  );
