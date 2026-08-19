-- RLS policies for website_leads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'website_leads_insert_public' AND tablename = 'website_leads') THEN
    CREATE POLICY "website_leads_insert_public" ON public.website_leads FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'website_leads_select_authenticated' AND tablename = 'website_leads') THEN
    CREATE POLICY "website_leads_select_authenticated" ON public.website_leads FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'website_leads_update_authenticated' AND tablename = 'website_leads') THEN
    CREATE POLICY "website_leads_update_authenticated" ON public.website_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'website_leads_delete_authenticated' AND tablename = 'website_leads') THEN
    CREATE POLICY "website_leads_delete_authenticated" ON public.website_leads FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- RLS policies for office_desk.registrations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'registrations_insert_service_role' AND tablename = 'registrations' AND schemaname = 'office_desk') THEN
    CREATE POLICY "registrations_insert_service_role" ON office_desk.registrations FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'registrations_select_service_role' AND tablename = 'registrations' AND schemaname = 'office_desk') THEN
    CREATE POLICY "registrations_select_service_role" ON office_desk.registrations FOR SELECT TO service_role USING (true);
  END IF;
END $$;

-- Archive function
CREATE OR REPLACE FUNCTION public.archive_lead_and_create_registration(
  p_lead_id uuid,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_charge_id text DEFAULT NULL,
  p_paypal_transaction_id text DEFAULT NULL
)
RETURNS office_desk.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lead public.website_leads%ROWTYPE;
  v_registration office_desk.registrations%ROWTYPE;
  v_tenant_id uuid;
  v_student_name text;
  v_student_email text;
  v_student_phone text;
  v_course_name text;
  v_notes text;
BEGIN
  SELECT * INTO v_lead FROM public.website_leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'archive_lead_and_create_registration: lead % not found', p_lead_id;
  END IF;
  IF v_lead.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'archive_lead_and_create_registration: lead % is already archived', p_lead_id;
  END IF;

  SELECT id INTO v_tenant_id FROM public.tenant_lms WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'archive_lead_and_create_registration: no active tenant found';
  END IF;

  v_student_name := COALESCE(v_lead.child_name, TRIM(CONCAT(COALESCE(v_lead.family_first_name, ''), ' ', COALESCE(v_lead.family_last_name, ''))), v_lead.name, 'Unknown');
  v_student_email := COALESCE(v_lead.family_email, v_lead.email);
  v_student_phone := COALESCE(v_lead.family_phone, v_lead.phone);
  v_course_name := COALESCE(v_lead.child_preferred_core_curriculum, 'General');

  v_notes := format('Zone: %s | Curriculum: %s | Grade: %s | Year: %s | Intake: %s | Language: %s | Currency: %s | Faith: %s | Citizenship: %s | Residency: %s',
    COALESCE(v_lead.zone_selection::text, 'auto'),
    COALESCE(v_lead.child_preferred_core_curriculum, 'N/A'),
    COALESCE(v_lead.child_preferred_starting_grade, 'N/A'),
    COALESCE(v_lead.child_preferred_starting_year::text, 'N/A'),
    COALESCE(v_lead.child_intake_group, 'N/A'),
    COALESCE(v_lead.family_primary_language, 'N/A'),
    COALESCE(v_lead.family_preferred_currency, 'N/A'),
    COALESCE(v_lead.family_primary_faith, 'N/A'),
    COALESCE(v_lead.child_country_of_citizenship, 'N/A'),
    COALESCE(v_lead.child_country_of_residency, 'N/A'));

  INSERT INTO office_desk.registrations (tenant_id, student_name, student_email, student_phone, course_name, status, notes, payment_attached_at, stripe_customer_id, stripe_charge_id, paypal_transaction_id)
  VALUES (v_tenant_id, v_student_name, v_student_email, v_student_phone, v_course_name, 'pending_init', v_notes, now(), p_stripe_customer_id, p_stripe_charge_id, p_paypal_transaction_id)
  RETURNING * INTO v_registration;

  UPDATE public.website_leads SET archived_at = now(), archive_reason = 'converted_to_registration', registration_id = v_registration.id WHERE id = p_lead_id;
  RETURN v_registration;
END;
$function$;

-- Grants
GRANT EXECUTE ON FUNCTION public.archive_lead_and_create_registration(uuid, text, text, text) TO service_role;
GRANT INSERT ON office_desk.registrations TO service_role;

-- updated_at trigger for website_leads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_website_leads_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.update_website_leads_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER update_website_leads_updated_at BEFORE UPDATE ON public.website_leads FOR EACH ROW EXECUTE FUNCTION public.update_website_leads_updated_at();
  END IF;
END $$;
