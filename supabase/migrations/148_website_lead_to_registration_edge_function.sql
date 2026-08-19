-- Migration 148: website-lead-to-registration Edge Function + payment webhook handler
-- Extends public.website_leads with family/child/zone fields from Lovable form
-- Creates archive_lead_and_create_registration() DB function
-- Adds RLS for service_role webhook inserts on office_desk.registrations
--
-- Flow:
--   1. Lovable form → POST /website-lead-to-registration → insert website_leads → create Stripe/PayPal session
--   2. Payment webhook → POST /website-lead-payment-webhook → archive lead → create registration → notify

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. EXTEND public.website_leads with Lovable registration form fields
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.website_leads
  ADD COLUMN IF NOT EXISTS family_first_name text,
  ADD COLUMN IF NOT EXISTS family_last_name text,
  ADD COLUMN IF NOT EXISTS family_email text,
  ADD COLUMN IF NOT EXISTS family_phone text,
  ADD COLUMN IF NOT EXISTS family_relation_to_child text,
  ADD COLUMN IF NOT EXISTS family_primary_language text,
  ADD COLUMN IF NOT EXISTS family_preferred_currency text,
  ADD COLUMN IF NOT EXISTS family_primary_faith text,
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS child_year_of_birth integer,
  ADD COLUMN IF NOT EXISTS child_country_of_citizenship text,
  ADD COLUMN IF NOT EXISTS child_country_of_residency text,
  ADD COLUMN IF NOT EXISTS child_preferred_core_curriculum text,
  ADD COLUMN IF NOT EXISTS child_preferred_starting_grade text,
  ADD COLUMN IF NOT EXISTS child_preferred_starting_year integer,
  ADD COLUMN IF NOT EXISTS child_intake_group text,
  ADD COLUMN IF NOT EXISTS zone_selection integer,
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('stripe', 'paypal')),
  ADD COLUMN IF NOT EXISTS registration_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text;

COMMENT ON COLUMN public.website_leads.family_first_name IS 'Parent/guardian first name from Lovable form';
COMMENT ON COLUMN public.website_leads.family_last_name IS 'Parent/guardian last name from Lovable form';
COMMENT ON COLUMN public.website_leads.family_email IS 'Parent/guardian email (may differ from lead email)';
COMMENT ON COLUMN public.website_leads.family_phone IS 'Parent/guardian phone number';
COMMENT ON COLUMN public.website_leads.family_relation_to_child IS 'Relationship of family member to child (e.g. mother, father, guardian)';
COMMENT ON COLUMN public.website_leads.family_primary_language IS 'Family primary language';
COMMENT ON COLUMN public.website_leads.family_preferred_currency IS 'Preferred currency (e.g. USD, ZAR)';
COMMENT ON COLUMN public.website_leads.family_primary_faith IS 'Primary faith tradition';
COMMENT ON COLUMN public.website_leads.child_name IS 'Full name of the child enrolling';
COMMENT ON COLUMN public.website_leads.child_year_of_birth IS 'Child year of birth (e.g. 2015)';
COMMENT ON COLUMN public.website_leads.child_country_of_citizenship IS 'Child country of citizenship';
COMMENT ON COLUMN public.website_leads.child_country_of_residency IS 'Child country of residency';
COMMENT ON COLUMN public.website_leads.child_preferred_core_curriculum IS 'Preferred core curriculum (e.g. Cambridge, CAPS, American)';
COMMENT ON COLUMN public.website_leads.child_preferred_starting_grade IS 'Preferred starting grade (e.g. Grade 5)';
COMMENT ON COLUMN public.website_leads.child_preferred_starting_year IS 'Preferred starting year (e.g. 2026)';
COMMENT ON COLUMN public.website_leads.child_intake_group IS 'Intake group assignment (e.g. Fall 2026)';
COMMENT ON COLUMN public.website_leads.zone_selection IS 'User-selected timezone zone (1-5), or auto-detected from timezone';
COMMENT ON COLUMN public.website_leads.payment_method IS 'Payment method selected at form: stripe or paypal';
COMMENT ON COLUMN public.website_leads.registration_id IS 'FK to office_desk.registrations after conversion';
COMMENT ON COLUMN public.website_leads.archived_at IS 'Timestamp when lead was archived (converted to registration). NULL = active.';
COMMENT ON COLUMN public.website_leads.archive_reason IS 'Reason for archiving. Set to converted_to_registration on payment success.';

-- Indexes for webhook lookups
CREATE INDEX IF NOT EXISTS idx_website_leads_registration_id
  ON public.website_leads (registration_id)
  WHERE registration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_leads_archived
  ON public.website_leads (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_leads_family_email
  ON public.website_leads (family_email)
  WHERE family_email IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- 2. ARCHIVE LEAD AND CREATE REGISTRATION FUNCTION
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.archive_lead_and_create_registration(
  p_lead_id       uuid,
  p_stripe_customer_id   text DEFAULT NULL,
  p_stripe_charge_id     text DEFAULT NULL,
  p_paypal_transaction_id text DEFAULT NULL
)
RETURNS office_desk.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lead          public.website_leads%ROWTYPE;
  v_registration  office_desk.registrations%ROWTYPE;
  v_tenant_id     uuid;
  v_student_name  text;
  v_student_email text;
  v_student_phone text;
  v_course_name   text;
  v_notes         text;
BEGIN
  -- Fetch the website lead
  SELECT * INTO v_lead
    FROM public.website_leads
   WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'archive_lead_and_create_registration: lead % not found', p_lead_id;
  END IF;

  IF v_lead.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'archive_lead_and_create_registration: lead % is already archived', p_lead_id;
  END IF;

  -- Resolve tenant (default to Redhouse tenant #1)
  -- The website_leads table doesn't have tenant_id, so we use the first active LMS tenant
  SELECT id INTO v_tenant_id
    FROM public.tenant_lms
   WHERE is_active = true
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'archive_lead_and_create_registration: no active tenant found';
  END IF;

  -- Build student name from family fields
  v_student_name := COALESCE(
    TRIM(CONCAT(COALESCE(v_lead.family_first_name, ''), ' ', COALESCE(v_lead.family_last_name, ''))),
    v_lead.child_name,
    v_lead.name,
    'Unknown'
  );

  -- Use child_name as the student if available, otherwise family name
  IF v_lead.child_name IS NOT NULL AND v_lead.child_name != '' THEN
    v_student_name := v_lead.child_name;
  END IF;

  v_student_email := COALESCE(v_lead.family_email, v_lead.email);
  v_student_phone := COALESCE(v_lead.family_phone, v_lead.phone);
  v_course_name := COALESCE(v_lead.child_preferred_core_curriculum, 'General');

  -- Build notes from form data
  v_notes := format(
    'Zone: %s | Curriculum: %s | Grade: %s | Year: %s | Intake: %s | Language: %s | Currency: %s | Faith: %s | Citizenship: %s | Residency: %s',
    COALESCE(v_lead.zone_selection::text, 'auto'),
    COALESCE(v_lead.child_preferred_core_curriculum, 'N/A'),
    COALESCE(v_lead.child_preferred_starting_grade, 'N/A'),
    COALESCE(v_lead.child_preferred_starting_year::text, 'N/A'),
    COALESCE(v_lead.child_intake_group, 'N/A'),
    COALESCE(v_lead.family_primary_language, 'N/A'),
    COALESCE(v_lead.family_preferred_currency, 'N/A'),
    COALESCE(v_lead.family_primary_faith, 'N/A'),
    COALESCE(v_lead.child_country_of_citizenship, 'N/A'),
    COALESCE(v_lead.child_country_of_residency, 'N/A')
  );

  -- Create registration
  INSERT INTO office_desk.registrations (
    tenant_id,
    student_name,
    student_email,
    student_phone,
    course_name,
    status,
    notes,
    payment_attached_at,
    stripe_customer_id,
    stripe_charge_id,
    paypal_transaction_id
  ) VALUES (
    v_tenant_id,
    v_student_name,
    v_student_email,
    v_student_phone,
    v_course_name,
    'pending_init',
    v_notes,
    now(),
    p_stripe_customer_id,
    p_stripe_charge_id,
    p_paypal_transaction_id
  )
  RETURNING * INTO v_registration;

  -- Archive the website lead
  UPDATE public.website_leads
     SET archived_at = now(),
         archive_reason = 'converted_to_registration',
         registration_id = v_registration.id
   WHERE id = p_lead_id;

  RETURN v_registration;
END;
$function$;

-- Grant EXECUTE to service_role (webhooks are authenticated via Stripe/PayPal signature, not JWT)
GRANT EXECUTE ON FUNCTION public.archive_lead_and_create_registration(uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION public.archive_lead_and_create_registration(uuid, text, text, text) IS
  'Row 81: Archives a website_leads record and creates an office_desk.registrations row. Called from payment webhook.';

-- ═══════════════════════════════════════════════════════════
-- 3. RLS: office_desk.registrations — service_role INSERT for webhook
-- ═══════════════════════════════════════════════════════════

-- Ensure service_role can INSERT into registrations (needed by the DB function via SECURITY DEFINER)
-- The function already uses SECURITY DEFINER, but explicit GRANTs are defense-in-depth
GRANT INSERT ON office_desk.registrations TO service_role;

-- ═══════════════════════════════════════════════════════════
-- 4. RLS: website_leads — allow service_role UPDATE for archive
-- ═══════════════════════════════════════════════════════════

-- service_role already has UPDATE via default grants, but the function
-- uses SECURITY DEFINER so RLS is bypassed. No new policy needed.

-- ═══════════════════════════════════════════════════════════
-- 5. LEADS ARCHIVE: allow archived website_leads to show in office_desk view
-- ═══════════════════════════════════════════════════════════

-- office_desk staff can see archived leads (for conversion audit trail)
-- The existing front_desk.leads policies exclude archived leads (migration 109).
-- We don't modify those policies here — the website_leads table is separate.

-- ═══════════════════════════════════════════════════════════
-- 6. TRIGGER: office-desk-notify on registration INSERT (Row 87)
-- ═══════════════════════════════════════════════════════════

-- Enable pg_net extension for HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function to invoke office-desk-notify on registration INSERT
CREATE OR REPLACE FUNCTION office_desk.on_registration_created()
RETURNS TRIGGER AS $$
DECLARE
  v_notify_url text;
  v_service_key text;
BEGIN
  -- Use current_setting(text, boolean) — returns NULL (not error) if unset
  v_notify_url := current_setting('app.office_desk_notify_url', true);
  IF v_notify_url IS NULL THEN
    v_notify_url := 'http://localhost:54321/functions/v1/office-desk-notify';
  END IF;

  v_service_key := current_setting('app.service_role_key', true);

  -- Call edge function via pg_net (async HTTP POST, non-blocking)
  PERFORM net.http_post(
    url := v_notify_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    body := jsonb_build_object(
      'event', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    ),
    timeout_milliseconds := 5000
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on office_desk.registrations INSERT
DROP TRIGGER IF EXISTS on_registration_created ON office_desk.registrations;
CREATE TRIGGER on_registration_created
  AFTER INSERT ON office_desk.registrations
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.on_registration_created();

-- Config for trigger (set via Supabase dashboard in production, or session SET in local dev)
-- ALTER DATABASE postgres SET app.office_desk_notify_url = 'http://localhost:54321/functions/v1/office-desk-notify';
-- ALTER DATABASE postgres SET app.service_role_key = 'env(SUPABASE_SERVICE_ROLE_KEY)';

COMMIT;
