-- Migration 201: Sync website_leads → front_desk.leads

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. COLUMN: source_type on front_desk.leads
-- ═══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'front_desk'
    AND table_name = 'leads'
    AND column_name = 'source_type'
  ) THEN
    ALTER TABLE front_desk.leads
      ADD COLUMN source_type text NOT NULL DEFAULT 'contact_form'
      CHECK (source_type IN (
        'contact_form',
        'live_call_booking',
        'enrollment_call_booking',
        'registration',
        'teacher_application',
        'manual',
        'other'
      ));
  END IF;
END $$;

COMMENT ON COLUMN front_desk.leads.source_type IS 'Origin of the lead: contact_form, live_call_booking, enrollment_call_booking, registration, teacher_application, manual, other';

CREATE INDEX IF NOT EXISTS idx_leads_source_type ON front_desk.leads(source_type);

-- ═══════════════════════════════════════════════════════════
-- 2. TABLE: front_desk.lead_source_log
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS front_desk.lead_source_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_lead_id uuid,
  lead_id         uuid NOT NULL,
  tenant_id       uuid NOT NULL,
  source_type     text NOT NULL,
  sync_method     text NOT NULL CHECK (sync_method IN ('trigger', 'edge_function')),
  email           text NOT NULL,
  synced_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE front_desk.lead_source_log ENABLE ROW LEVEL SECURITY;

-- Admin + front_desk can read
DROP POLICY IF EXISTS lead_source_log_admin_select ON front_desk.lead_source_log;
CREATE POLICY lead_source_log_admin_select ON front_desk.lead_source_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'front_desk')
    )
  );

-- Only service_role can insert (trigger/EF)
GRANT INSERT ON front_desk.lead_source_log TO service_role;
GRANT SELECT ON front_desk.lead_source_log TO authenticated;

CREATE INDEX IF NOT EXISTS idx_lead_source_log_website_lead ON front_desk.lead_source_log(website_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_source_log_lead ON front_desk.lead_source_log(lead_id);

COMMENT ON TABLE front_desk.lead_source_log IS 'Immutable audit trail of website_leads → front_desk.leads sync events';

-- ═══════════════════════════════════════════════════════════
-- 3. FUNCTION: sync_website_lead_to_front_desk()
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION front_desk.sync_website_lead_to_front_desk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tenant_id uuid;
  v_lead_id uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_notes text;
  v_source text;
  v_tags text[];
BEGIN
  v_name := TRIM(COALESCE(NEW.name, ''));
  v_email := LOWER(TRIM(NEW.email));

  IF v_email IS NULL OR v_email = '' THEN
    RAISE WARNING 'sync_website_lead: skipping row % — no email', NEW.id;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM front_desk.leads
    WHERE LOWER(email) = v_email
  ) THEN
    RAISE NOTICE 'sync_website_lead: lead with email % already exists, skipping', v_email;
    RETURN NEW;
  END IF;

  SELECT id INTO v_tenant_id
  FROM tenant_devotional
  WHERE is_active = true
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'sync_website_lead: no active tenant_devotional found';
  END IF;

  v_source := 'contact_form';
  v_tags := ARRAY['General Enquiry'];
  v_notes := TRIM(COALESCE(NEW.message, ''));

  INSERT INTO front_desk.leads (
    tenant_id, name, email, phone, notes,
    source, source_type, tags, status,
    existing_profile
  ) VALUES (
    v_tenant_id,
    NULLIF(v_name, ''),
    v_email,
    NULL,
    NULLIF(v_notes, ''),
    'Contact Form',
    v_source,
    v_tags,
    'enquiry',
    false
  )
  RETURNING id INTO v_lead_id;

  INSERT INTO front_desk.lead_source_log (
    website_lead_id, lead_id, tenant_id, source_type, sync_method, email
  ) VALUES (
    NEW.id, v_lead_id, v_tenant_id, v_source, 'trigger', v_email
  );

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION front_desk.sync_website_lead_to_front_desk() IS 'Auto-sync: website_leads INSERT → front_desk.leads. Trigger on public.website_leads.';

-- ═══════════════════════════════════════════════════════════
-- 4. TRIGGER: fire on INSERT to public.website_leads
-- ═══════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_sync_website_lead ON public.website_leads;
CREATE TRIGGER trg_sync_website_lead
  AFTER INSERT ON public.website_leads
  FOR EACH ROW
  EXECUTE FUNCTION front_desk.sync_website_lead_to_front_desk();

COMMIT;
