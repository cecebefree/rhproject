-- ITEM-23-DEP-B: leads table — Front Desk intake, pre-payment pipeline.
-- Tenant-scoped, service_role INSERT only (verify-turnstile EF).
-- Read and management policies ship with the Front Desk read EF later.
-- See docs/spec/front-desk-registration.md §4 for design intent.

BEGIN;

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant_devotional(id),
  name text,
  email text,
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'enquiry'
    CHECK (status IN ('enquiry', 'qualified', 'invoiced', 'converted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- No SELECT/UPDATE/DELETE policies — ships with Front Desk read EF later.
-- service_role bypasses RLS; only grant needed is INSERT below.

GRANT INSERT ON public.leads TO service_role;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
