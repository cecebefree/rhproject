SET local check_function_bodies = off;

DROP POLICY "gm_member_insert" ON "public"."group_messages";

DROP POLICY "gm_member_read" ON "public"."group_messages";

DROP POLICY "mp_admin_teacher_all" ON "school_desk"."meeting_participants";

DROP POLICY "meetings_participant_select" ON "school_desk"."meetings";

ALTER TABLE "office_desk"."invoices"
  DROP CONSTRAINT "invoices_status_check";

ALTER TABLE "public"."group_messages"
  DROP CONSTRAINT "group_messages_group_id_fkey";

ALTER TABLE "public"."group_messages"
  DROP CONSTRAINT "group_messages_sender_id_fkey";

ALTER TABLE "school_desk"."communications"
  DROP CONSTRAINT "communications_profile_id_fkey";

ALTER TABLE "school_desk"."communications"
  DROP CONSTRAINT "communications_recorded_by_fkey";

ALTER TABLE "school_desk"."communications"
  DROP CONSTRAINT "communications_tenant_id_fkey";

ALTER TABLE "school_desk"."meeting_participants"
  DROP CONSTRAINT "meeting_participants_meeting_id_fkey";

ALTER TABLE "school_desk"."meeting_participants"
  DROP CONSTRAINT "meeting_participants_profile_id_fkey";

ALTER TABLE "school_desk"."meetings"
  DROP CONSTRAINT "meetings_organizer_id_fkey";

ALTER TABLE "school_desk"."meetings"
  DROP CONSTRAINT "meetings_tenant_id_fkey";

ALTER TABLE "school_desk"."news"
  DROP CONSTRAINT "news_category_check";

ALTER TABLE "school_desk"."news"
  DROP COLUMN "target_audience";

DROP TABLE "public"."clubs";

DROP TABLE "public"."group_conversations";

DROP TABLE "public"."group_messages";

DROP TABLE "school_desk"."communications";

DROP TABLE "school_desk"."meeting_participants";

DROP TABLE "school_desk"."meetings";

DROP FUNCTION "school_desk"."set_updated_at"();

ALTER TABLE "public"."website_leads"
  ADD COLUMN "phone" text;

ALTER TABLE "public"."website_leads"
  ADD COLUMN "tenant" text NOT NULL DEFAULT 'redhouse'::text;

ALTER TABLE "office_desk"."invoices"
  ALTER COLUMN "registration_id" SET NOT NULL;

ALTER TABLE "office_desk"."payments"
  ALTER COLUMN "invoice_id" SET NOT NULL;

ALTER TABLE "school_desk"."news"
  ALTER COLUMN "category" SET DEFAULT 'general'::text;

CREATE OR REPLACE FUNCTION public.advance_lead_pipeline (
  p_lead_id   uuid,
  p_new_stage front_desk.lead_pipeline_stage,
  p_notes     text                           DEFAULT NULL::text
)
  RETURNS front_desk.leads
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_lead     front_desk.leads;
  v_caller   profiles%ROWTYPE;
BEGIN
  -- Resolve caller
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'advance_lead_pipeline: caller profile not found';
  END IF;

  IF v_caller.role NOT IN ('admin', 'front_desk') THEN
    RAISE EXCEPTION 'advance_lead_pipeline: role % not authorized', v_caller.role;
  END IF;

  -- Fetch lead
  SELECT * INTO v_lead
    FROM front_desk.leads
   WHERE id = p_lead_id
     AND tenant_id = v_caller.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'advance_lead_pipeline: lead % not found or cross-tenant', p_lead_id;
  END IF;

  -- Validate stage is appropriate for pipeline
  CASE v_lead.pipeline
    WHEN 'general_enquiry' THEN
      IF p_new_stage NOT IN ('new', 'contacted', 'qualified', 'resolved', 'archived') THEN
        RAISE EXCEPTION 'advance_lead_pipeline: stage % not valid for general_enquiry', p_new_stage;
      END IF;
    WHEN 'registration' THEN
      IF p_new_stage NOT IN ('new', 'contacted', 'qualified', 'fee_captured', 'handed_off', 'archived') THEN
        RAISE EXCEPTION 'advance_lead_pipeline: stage % not valid for registration', p_new_stage;
      END IF;
    WHEN 'career' THEN
      IF p_new_stage NOT IN ('new', 'reviewed', 'interview', 'hired', 'rejected', 'archived') THEN
        RAISE EXCEPTION 'advance_lead_pipeline: stage % not valid for career', p_new_stage;
      END IF;
  END CASE;

  -- Update lead
  UPDATE front_desk.leads
     SET pipeline_stage = p_new_stage,
         pipeline_notes = COALESCE(p_notes, pipeline_notes),
         pipeline_updated_at = now(),
         updated_at = now()
   WHERE id = p_lead_id
   RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_lead_to_pipeline (
  p_lead_id         uuid,
  p_archive_reason  text,
  p_sentiment       text DEFAULT 'neutral'::text,
  p_enquiry_type    text DEFAULT NULL::text,
  p_outcome_summary text DEFAULT NULL::text
)
  RETURNS front_desk.pipeline_archive
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_lead          front_desk.leads;
  v_caller        profiles%ROWTYPE;
  v_first_contact timestamptz;
  v_response_hrs  integer;
  v_total_touches integer;
  v_archive       front_desk.pipeline_archive;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'archive_lead_to_pipeline: caller profile not found';
  END IF;

  IF v_caller.role NOT IN ('admin', 'front_desk') THEN
    RAISE EXCEPTION 'archive_lead_to_pipeline: role % not authorized', v_caller.role;
  END IF;

  SELECT * INTO v_lead
    FROM front_desk.leads
   WHERE id = p_lead_id
     AND tenant_id = v_caller.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'archive_lead_to_pipeline: lead % not found or cross-tenant', p_lead_id;
  END IF;

  -- Calculate response time (first call or email vs lead creation)
  SELECT MIN(created_at) INTO v_first_contact
    FROM front_desk.call_logs
   WHERE lead_id = p_lead_id;

  IF v_first_contact IS NOT NULL THEN
    v_response_hrs := EXTRACT(EPOCH FROM (v_first_contact - v_lead.created_at)) / 3600;
  END IF;

  -- Count total touches
  SELECT COUNT(*) INTO v_total_touches
    FROM front_desk.call_logs
   WHERE lead_id = p_lead_id;

  v_total_touches := v_total_touches + (
    SELECT COUNT(*) FROM front_desk.email_logs WHERE lead_id = p_lead_id
  );

  -- Insert archive record
  INSERT INTO front_desk.pipeline_archive (
    lead_id, tenant_id, pipeline, final_stage, archive_reason,
    archive_notes, sentiment, enquiry_type,
    lead_source, lead_tags, lead_name, lead_email,
    response_time_hours, total_touches, outcome_summary,
    archived_by
  ) VALUES (
    v_lead.id, v_lead.tenant_id, v_lead.pipeline, v_lead.pipeline_stage, p_archive_reason,
    p_notes, p_sentiment, p_enquiry_type,
    v_lead.source, v_lead.tags, v_lead.name, v_lead.email,
    v_response_hrs, v_total_touches, p_outcome_summary,
    auth.uid()
  ) RETURNING v_archive INTO v_archive;

  -- Mark lead as archived in main table
  UPDATE front_desk.leads
     SET pipeline_stage = 'archived',
         archived_at = now(),
         archive_reason = CASE
           WHEN p_archive_reason IN ('enrolled', 'withdrawn', 'inactive', 'duplicate')
             THEN p_archive_reason::front_desk.archive_reason_type
           ELSE 'other'
         END,
         updated_at = now()
   WHERE id = p_lead_id;

  RETURN v_archive;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_website_lead (
  p_name            text,
  p_email           text,
  p_phone           text,
  p_message         text,
  p_tenant          text,
  p_turnstile_token text,
  p_ip_address      text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_lead_id uuid;
BEGIN
  INSERT INTO public.website_leads (
    name, email, phone, message, tenant, turnstile_token, ip_address
  ) VALUES (
    p_name, p_email, p_phone, p_message, p_tenant, p_turnstile_token, p_ip_address
  )
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_lead_to_pipeline (
  p_lead_id  uuid,
  p_pipeline front_desk.lead_pipeline,
  p_notes    text                     DEFAULT NULL::text
)
  RETURNS front_desk.leads
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_lead     front_desk.leads;
  v_caller   profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'move_lead_to_pipeline: caller profile not found';
  END IF;

  IF v_caller.role NOT IN ('admin', 'front_desk') THEN
    RAISE EXCEPTION 'move_lead_to_pipeline: role % not authorized', v_caller.role;
  END IF;

  SELECT * INTO v_lead
    FROM front_desk.leads
   WHERE id = p_lead_id
     AND tenant_id = v_caller.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'move_lead_to_pipeline: lead % not found or cross-tenant', p_lead_id;
  END IF;

  UPDATE front_desk.leads
     SET pipeline = p_pipeline,
         pipeline_stage = 'new',
         pipeline_notes = p_notes,
         pipeline_updated_at = now(),
         updated_at = now()
   WHERE id = p_lead_id
   RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$function$;

ALTER TABLE "office_desk"."invoices"
  ADD CONSTRAINT "invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'void'::text])));

ALTER TABLE "school_desk"."news"
  ADD CONSTRAINT "news_category_check" CHECK ((category = ANY (ARRAY['general'::text, 'school_desk'::text, 'student_body'::text, 'schoolboard'::text, 'hub'::text])));

CREATE INDEX idx_invoices_registration ON office_desk.invoices USING btree (registration_id);

CREATE POLICY "website_leads_tenant_isolation" ON "public"."website_leads"
  FOR SELECT
  TO "authenticated"
  USING (((tenant = (auth.jwt() ->> 'tenant_id'::text)) OR (CURRENT_USER = 'service_role'::name)));

COMMENT ON COLUMN "public"."website_leads"."phone" IS 'Phone number from lead form';

COMMENT ON COLUMN "public"."website_leads"."tenant" IS 'Tenant association for multi-tenant lead routing';

COMMENT ON COLUMN "school_desk"."news"."category" IS 'News category: general, school_desk, student_body, schoolboard, hub';

COMMENT ON FUNCTION "public"."insert_website_lead"(text, text, text, text, text, text, text) IS 'Insert website lead with tenant context; accessible to anon & authenticated';

GRANT EXECUTE ON FUNCTION "public"."insert_website_lead"(text, text, text, text, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

