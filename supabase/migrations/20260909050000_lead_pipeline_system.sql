-- Migration 20260909050000: Lead Pipeline System
-- Adds pipeline tracking, pipeline stages, and AI-ready archive for Front Desk CRM
--
-- Pipelines:
--   general_enquiry  → new → contacted → qualified → resolved → archived
--   registration     → new → contacted → qualified → fee_captured → handed_off → archived
--   career           → new → reviewed → interview → hired | rejected → archived

BEGIN;

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE front_desk.lead_pipeline AS ENUM (
  'general_enquiry',
  'registration',
  'career'
);

CREATE TYPE front_desk.lead_pipeline_stage AS ENUM (
  -- General enquiry stages
  'new',
  'contacted',
  'qualified',
  'resolved',
  -- Registration-specific stages
  'fee_captured',
  'handed_off',
  -- Career-specific stages
  'reviewed',
  'interview',
  'hired',
  'rejected',
  -- Terminal
  'archived'
);

-- ============================================================
-- 2. COLUMNS on front_desk.leads
-- ============================================================

ALTER TABLE front_desk.leads
  ADD COLUMN IF NOT EXISTS pipeline front_desk.lead_pipeline DEFAULT 'general_enquiry',
  ADD COLUMN IF NOT EXISTS pipeline_stage front_desk.lead_pipeline_stage DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS pipeline_notes text,
  ADD COLUMN IF NOT EXISTS pipeline_updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN front_desk.leads.pipeline IS 'Which pipeline this lead belongs to: general_enquiry, registration, or career';
COMMENT ON COLUMN front_desk.leads.pipeline_stage IS 'Current stage within the pipeline';
COMMENT ON COLUMN front_desk.leads.pipeline_notes IS 'Notes specific to pipeline progression';
COMMENT ON COLUMN front_desk.leads.pipeline_updated_at IS 'When pipeline stage last changed';

CREATE INDEX IF NOT EXISTS idx_leads_pipeline ON front_desk.leads(pipeline);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON front_desk.leads(pipeline_stage);

-- ============================================================
-- 3. PIPELINE ARCHIVE TABLE (AI-analysis-ready)
-- ============================================================

CREATE TABLE front_desk.pipeline_archive (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES front_desk.leads(id),
  tenant_id       uuid NOT NULL,
  pipeline        front_desk.lead_pipeline NOT NULL,
  final_stage     front_desk.lead_pipeline_stage NOT NULL,
  archive_reason  text NOT NULL,           -- 'enrolled', 'withdrawn', 'inactive', 'duplicate', 'hired', 'rejected', 'resolved'
  archive_notes   text,
  -- Structured fields for AI analysis
  sentiment       text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  enquiry_type    text,                    -- 'curriculum', 'pricing', 'general', 'technical', 'complaint'
  lead_source     text,                    -- copy of lead.source for context
  lead_tags       text[],                  -- copy of lead.tags for context
  lead_name       text,
  lead_email      text,
  response_time_hours integer,             -- hours from lead created to first contact
  total_touches   integer DEFAULT 0,       -- number of call/email logged against lead
  outcome_summary text,                    -- human-readable summary of what happened
  archived_at     timestamptz NOT NULL DEFAULT now(),
  archived_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE front_desk.pipeline_archive ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE front_desk.pipeline_archive IS 'Structured archive of completed leads for AI analysis. Each row is a fully-resolved lead with metadata for batch analysis.';

CREATE INDEX IF NOT EXISTS idx_pipeline_archive_tenant ON front_desk.pipeline_archive(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_archive_pipeline ON front_desk.pipeline_archive(pipeline);
CREATE INDEX IF NOT EXISTS idx_pipeline_archive_sentiment ON front_desk.pipeline_archive(sentiment);
CREATE INDEX IF NOT EXISTS idx_pipeline_archive_archived_at ON front_desk.pipeline_archive(archived_at DESC);

-- RLS: admin + front_desk can read; service_role inserts via function
CREATE POLICY pipeline_archive_admin_select ON front_desk.pipeline_archive
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'front_desk')
    )
  );

GRANT SELECT ON front_desk.pipeline_archive TO authenticated;

-- ============================================================
-- 4. PIPELINE PROGRESSION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.advance_lead_pipeline(
  p_lead_id     uuid,
  p_new_stage   front_desk.lead_pipeline_stage,
  p_notes       text DEFAULT NULL
)
RETURNS front_desk.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.advance_lead_pipeline(uuid, front_desk.lead_pipeline_stage, text) TO authenticated;

-- ============================================================
-- 5. MOVE LEAD TO PIPELINE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.move_lead_to_pipeline(
  p_lead_id     uuid,
  p_pipeline    front_desk.lead_pipeline,
  p_notes       text DEFAULT NULL
)
RETURNS front_desk.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.move_lead_to_pipeline(uuid, front_desk.lead_pipeline, text) TO authenticated;

-- ============================================================
-- 6. ARCHIVE LEAD TO PIPELINE_ARCHIVE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.archive_lead_to_pipeline(
  p_lead_id         uuid,
  p_archive_reason  text,
  p_sentiment       text DEFAULT 'neutral',
  p_enquiry_type    text DEFAULT NULL,
  p_outcome_summary text DEFAULT NULL
)
RETURNS front_desk.pipeline_archive
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Count total touches (call_logs have lead_id directly; email_logs linked via inquiries)
  SELECT COUNT(*) INTO v_total_touches
    FROM front_desk.call_logs
   WHERE lead_id = p_lead_id;

  -- Insert archive record
  INSERT INTO front_desk.pipeline_archive (
    lead_id, tenant_id, pipeline, final_stage, archive_reason,
    archive_notes, sentiment, enquiry_type,
    lead_source, lead_tags, lead_name, lead_email,
    response_time_hours, total_touches, outcome_summary,
    archived_by
  ) VALUES (
    v_lead.id, v_lead.tenant_id, v_lead.pipeline, v_lead.pipeline_stage, p_archive_reason,
    p_outcome_summary, p_sentiment, p_enquiry_type,
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

GRANT EXECUTE ON FUNCTION public.archive_lead_to_pipeline(uuid, text, text, text, text) TO authenticated;

-- ============================================================
-- 7. AUTO-SET pipeline from source_type on insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_lead_pipeline_from_source()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Auto-assign pipeline based on source_type if not set
  IF NEW.pipeline IS NULL OR NEW.pipeline = 'general_enquiry' THEN
    IF NEW.source IN ('Registration', 'Enrollment Call') OR
       (NEW.tags @> ARRAY['Registration'] AND NEW.pipeline IS NULL) THEN
      NEW.pipeline := 'registration';
      NEW.pipeline_stage := 'new';
    ELSIF NEW.source IN ('Teacher Application', 'Careers') OR
         (NEW.tags @> ARRAY['Teacher Application'] AND NEW.pipeline IS NULL) THEN
      NEW.pipeline := 'career';
      NEW.pipeline_stage := 'new';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_lead_pipeline ON front_desk.leads;
CREATE TRIGGER trg_set_lead_pipeline
  BEFORE INSERT ON front_desk.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_lead_pipeline_from_source();

COMMIT;
