-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 168: Calendar Sync (Cal.com → Supabase)
-- ══════════════════════════════════════════════════════════════════════════════
-- Tables:   calendar_sync_events, calendar_webhook_logs, meeting_links
-- RPCs:     sync_calendar_event, cancel_calendar_event,
--           generate_meeting_link, get_org_calendar_events
-- Triggers: on_calendar_sync_events_insert, on_meeting_links_insert
-- RLS:      5 roles (office_desk_admin, school_desk_admin, teacher, student, parent)
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. SETUP — Safe teardown for re-runs (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Drop triggers
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'meeting_links' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_meeting_links_insert ON public.meeting_links;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'calendar_sync_events' AND relnamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS on_calendar_sync_events_insert ON public.calendar_sync_events;
  END IF;

  -- Drop functions
  DROP FUNCTION IF EXISTS public.on_sync_event_created() CASCADE;
  DROP FUNCTION IF EXISTS public.on_meeting_link_created() CASCADE;
  DROP FUNCTION IF EXISTS public.sync_calendar_event(uuid, uuid, text, text, text, timestamptz, timestamptz, text, text, jsonb, text, timestamptz) CASCADE;
  DROP FUNCTION IF EXISTS public.cancel_calendar_event(uuid, text) CASCADE;
  DROP FUNCTION IF EXISTS public.generate_meeting_link(uuid, text, text, text[]) CASCADE;
  DROP FUNCTION IF EXISTS public.get_org_calendar_events(uuid, timestamptz, timestamptz) CASCADE;

  -- Drop tables in reverse dependency order
  DROP TABLE IF EXISTS public.meeting_links CASCADE;
  DROP TABLE IF EXISTS public.calendar_webhook_logs CASCADE;
  DROP TABLE IF EXISTS public.calendar_sync_events CASCADE;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 CALENDAR SYNC EVENTS — External calendar events synced to Supabase
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.calendar_sync_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  calendar_id           uuid NOT NULL REFERENCES public.calendar(id) ON DELETE CASCADE,
  external_event_id     text NOT NULL UNIQUE,
  event_title           text NOT NULL,
  event_description     text,
  event_start           timestamptz NOT NULL,
  event_end             timestamptz NOT NULL,
  event_timezone        text NOT NULL DEFAULT 'UTC',
  location              text,
  attendees             jsonb NOT NULL DEFAULT '[]'::jsonb,
  meeting_link_type     text CHECK (meeting_link_type IN ('zoom', 'google_meet', 'none')),
  meeting_link_url      text,
  meeting_link_provider text,
  sync_status           text NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('synced', 'pending', 'failed', 'cancelled')),
  last_synced_at        timestamptz NOT NULL DEFAULT now(),
  external_updated_at   timestamptz,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sync_event_times CHECK (event_end > event_start)
);

COMMENT ON TABLE public.calendar_sync_events IS 'External calendar events (Cal.com, Google Calendar) synced into Supabase';
COMMENT ON COLUMN public.calendar_sync_events.external_event_id IS 'Unique ID from external provider (e.g. Cal.com booking UID)';
COMMENT ON COLUMN public.calendar_sync_events.attendees IS 'JSON array of {email, name, status} objects';
COMMENT ON COLUMN public.calendar_sync_events.sync_status IS 'synced | pending | failed | cancelled';
COMMENT ON COLUMN public.calendar_sync_events.meeting_link_type IS 'zoom | google_meet | none — set after meeting link generation';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 CALENDAR WEBHOOK LOGS — Inbound webhook audit trail
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.calendar_webhook_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid REFERENCES supabase.organizations(id) ON DELETE CASCADE,
  webhook_source        text NOT NULL,
  webhook_event_type    text NOT NULL,
  webhook_payload       jsonb NOT NULL,
  processing_status     text NOT NULL DEFAULT 'success'
    CHECK (processing_status IN ('success', 'failed', 'pending_retry')),
  error_message         text,
  retry_count           int NOT NULL DEFAULT 0,
  next_retry_at         timestamptz,
  processed_at          timestamptz,
  received_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.calendar_webhook_logs IS 'Inbound webhook audit trail — every Cal.com/Zoom webhook logged here';
COMMENT ON COLUMN public.calendar_webhook_logs.webhook_source IS 'cal_com | zoom | google_calendar';
COMMENT ON COLUMN public.calendar_webhook_logs.webhook_event_type IS 'booking.created | booking.updated | booking.cancelled | meeting.started | meeting.ended';
COMMENT ON COLUMN public.calendar_webhook_logs.processing_status IS 'success | failed | pending_retry';

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 MEETING LINKS — Video meeting metadata per synced event
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.meeting_links (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_sync_event_id    uuid NOT NULL REFERENCES public.calendar_sync_events(id) ON DELETE CASCADE,
  provider                  text NOT NULL CHECK (provider IN ('zoom', 'google_meet', 'calendly')),
  meeting_id                text NOT NULL,
  meeting_url               text NOT NULL,
  host_email                text NOT NULL,
  guest_emails              text[] NOT NULL DEFAULT '{}',
  password                  text,
  status                    text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at                timestamptz,
  ended_at                  timestamptz,
  recording_url             text,
  participant_count         int NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meeting_links IS 'Video meeting metadata (Zoom/Google Meet) linked to a calendar sync event';
COMMENT ON COLUMN public.meeting_links.meeting_id IS 'Provider-specific meeting ID';
COMMENT ON COLUMN public.meeting_links.password IS 'Zoom meeting password (nullable)';
COMMENT ON COLUMN public.meeting_links.guest_emails IS 'Array of attendee email addresses';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Calendar sync events indexes
CREATE INDEX idx_sync_events_org
  ON public.calendar_sync_events (organization_id);

CREATE INDEX idx_sync_events_calendar
  ON public.calendar_sync_events (calendar_id);

CREATE INDEX idx_sync_events_external_id
  ON public.calendar_sync_events (external_event_id);

CREATE INDEX idx_sync_events_date_range
  ON public.calendar_sync_events (event_start, event_end);

CREATE INDEX idx_sync_events_status
  ON public.calendar_sync_events (sync_status);

-- Webhook logs indexes
CREATE INDEX idx_webhook_logs_org
  ON public.calendar_webhook_logs (organization_id);

CREATE INDEX idx_webhook_logs_status
  ON public.calendar_webhook_logs (processing_status);

CREATE INDEX idx_webhook_logs_received
  ON public.calendar_webhook_logs (received_at DESC);

CREATE INDEX idx_webhook_logs_source
  ON public.calendar_webhook_logs (webhook_source, webhook_event_type);

-- Meeting links indexes
CREATE INDEX idx_meeting_links_event
  ON public.meeting_links (calendar_sync_event_id);

CREATE INDEX idx_meeting_links_provider
  ON public.meeting_links (provider);

CREATE INDEX idx_meeting_links_meeting_id
  ON public.meeting_links (meeting_id, provider);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.calendar_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_links ENABLE ROW LEVEL SECURITY;

-- Webhook logs: RLS disabled (internal-only, written by SECURITY DEFINER functions)

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 1: office_desk_admin — Full CRUD on all tables
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY oda_sync_events_all
  ON public.calendar_sync_events FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

CREATE POLICY oda_meeting_links_all
  ON public.meeting_links FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'office_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 2: school_desk_admin — Read all, limited write
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY sda_sync_events_select
  ON public.calendar_sync_events FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_sync_events_update_status
  ON public.calendar_sync_events FOR UPDATE TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text)
  WITH CHECK (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

CREATE POLICY sda_meeting_links_select
  ON public.meeting_links FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'school_desk_admin'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 3: teacher — Read all, no modification
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY teacher_sync_events_select
  ON public.calendar_sync_events FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text);

CREATE POLICY teacher_meeting_links_select
  ON public.meeting_links FOR SELECT TO authenticated
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'teacher'::text);

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 4: student — SELECT own calendar events only
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY student_sync_events_select_own
  ON public.calendar_sync_events FOR SELECT TO authenticated
  USING (
    attendees @> json_build_array(
      json_build_object('email', (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ))
    )::jsonb
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

CREATE POLICY student_meeting_links_select_own
  ON public.meeting_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_sync_events cse
      WHERE cse.id = meeting_links.calendar_sync_event_id
        AND cse.attendees @> json_build_array(
          json_build_object('email', (
            SELECT email FROM auth.users WHERE id = auth.uid()
          ))
        )::jsonb
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'student'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- ROLE 5: parent — SELECT child's calendar events only
-- ────────────────────────────────────────────────────────────────────────────

CREATE POLICY parent_sync_events_select_child
  ON public.calendar_sync_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      JOIN auth.users u ON u.id = p.id
      WHERE p.student_id = auth.uid()
      AND calendar_sync_events.attendees @> json_build_array(
        json_build_object('email', u.email)
      )::jsonb
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

CREATE POLICY parent_meeting_links_select_child
  ON public.meeting_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_sync_events cse
      JOIN public.parents p ON p.student_id = auth.uid()
      WHERE cse.id = meeting_links.calendar_sync_event_id
    )
    AND (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'parent'::text)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_sync_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_webhook_logs TO authenticated;

GRANT ALL ON public.calendar_sync_events TO service_role;
GRANT ALL ON public.meeting_links TO service_role;
GRANT ALL ON public.calendar_webhook_logs TO service_role;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 4.1 ON SYNC EVENT CREATED — Audit + webhook log
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_sync_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Audit log
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES (
    'calendar_sync_events',
    'CALENDAR_EVENT_SYNCED',
    row_to_json(NEW)::jsonb,
    NULL
  );

  -- Webhook log entry
  INSERT INTO public.calendar_webhook_logs (
    organization_id, webhook_source, webhook_event_type, webhook_payload, processing_status, processed_at
  ) VALUES (
    NEW.organization_id,
    'cal_com',
    'booking.created',
    row_to_json(NEW)::jsonb,
    'success',
    now()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_sync_event_created() IS 'Trigger: after calendar sync event insert — audit + webhook log';

CREATE TRIGGER on_calendar_sync_events_insert
  AFTER INSERT ON public.calendar_sync_events
  FOR EACH ROW
  EXECUTE FUNCTION public.on_sync_event_created();

-- ────────────────────────────────────────────────────────────────────────────
-- 4.2 ON MEETING LINK CREATED — Audit log
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_meeting_link_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
  VALUES (
    'meeting_links',
    'MEETING_LINK_CREATED',
    json_build_object(
      'provider', NEW.provider,
      'meeting_url', NEW.meeting_url,
      'meeting_id', NEW.meeting_id,
      'host_email', NEW.host_email
    )::jsonb,
    NULL
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_meeting_link_created() IS 'Trigger: after meeting link insert — audit log';

CREATE TRIGGER on_meeting_links_insert
  AFTER INSERT ON public.meeting_links
  FOR EACH ROW
  EXECUTE FUNCTION public.on_meeting_link_created();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 5.1 SYNC CALENDAR EVENT — Create or update external event
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_calendar_event(
  p_org_id               uuid,
  p_calendar_id          uuid,
  p_external_event_id    text,
  p_event_title          text,
  p_event_description    text,
  p_event_start          timestamptz,
  p_event_end            timestamptz,
  p_event_timezone       text,
  p_location             text,
  p_attendees            jsonb,
  p_meeting_link_type    text,
  p_external_updated_at  timestamptz
)
RETURNS TABLE(sync_event_id uuid, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_event_type  text;
BEGIN
  -- Check if external event already exists
  SELECT id INTO v_existing_id
  FROM public.calendar_sync_events
  WHERE external_event_id = p_external_event_id;

  IF FOUND THEN
    -- Update existing
    UPDATE public.calendar_sync_events
    SET event_title         = p_event_title,
        event_description   = p_event_description,
        event_start         = p_event_start,
        event_end           = p_event_end,
        event_timezone      = p_event_timezone,
        location            = p_location,
        attendees           = p_attendees,
        external_updated_at = p_external_updated_at,
        last_synced_at      = now(),
        updated_at          = now()
    WHERE id = v_existing_id;

    v_event_type := 'booking.updated';
    sync_event_id := v_existing_id;
  ELSE
    -- Insert new
    INSERT INTO public.calendar_sync_events (
      organization_id, calendar_id, external_event_id,
      event_title, event_description, event_start, event_end,
      event_timezone, location, attendees, meeting_link_type, sync_status
    ) VALUES (
      p_org_id, p_calendar_id, p_external_event_id,
      p_event_title, p_event_description, p_event_start, p_event_end,
      p_event_timezone, p_location, p_attendees, p_meeting_link_type, 'synced'
    )
    RETURNING id INTO sync_event_id;

    v_event_type := 'booking.created';
  END IF;

  -- Webhook log
  INSERT INTO public.calendar_webhook_logs (
    organization_id, webhook_source, webhook_event_type, webhook_payload, processing_status, processed_at
  ) VALUES (
    p_org_id, 'cal_com', v_event_type,
    json_build_object(
      'external_event_id', p_external_event_id,
      'event_title', p_event_title,
      'event_start', p_event_start,
      'event_end', p_event_end
    )::jsonb,
    'success', now()
  );

  -- Realtime notification
  PERFORM pg_notify(
    'calendar_events',
    json_build_object(
      'event', 'event_synced',
      'sync_event_id', sync_event_id,
      'org_id', p_org_id
    )::text
  );

  status := 'success';
  message := 'Event synced';
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.sync_calendar_event(uuid, uuid, text, text, text, timestamptz, timestamptz, text, text, jsonb, text, timestamptz)
  IS 'Create or update a synced calendar event from external provider — idempotent on external_event_id';

GRANT EXECUTE ON FUNCTION public.sync_calendar_event(uuid, uuid, text, text, text, timestamptz, timestamptz, text, text, jsonb, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_calendar_event(uuid, uuid, text, text, text, timestamptz, timestamptz, text, text, jsonb, text, timestamptz) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.2 CANCEL CALENDAR EVENT — Mark event + meeting links as cancelled
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_calendar_event(
  p_sync_event_id       uuid,
  p_cancellation_reason text
)
RETURNS TABLE(status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check event exists
  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_sync_events WHERE id = p_sync_event_id
  ) THEN
    status := 'error';
    message := 'Sync event not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Cancel the event
  UPDATE public.calendar_sync_events
  SET sync_status = 'cancelled',
      updated_at = now()
  WHERE id = p_sync_event_id;

  -- Cancel associated meeting links
  UPDATE public.meeting_links
  SET status = 'cancelled',
      ended_at = now(),
      updated_at = now()
  WHERE calendar_sync_event_id = p_sync_event_id
    AND status = 'active';

  -- Webhook log
  INSERT INTO public.calendar_webhook_logs (
    organization_id, webhook_source, webhook_event_type, webhook_payload, processing_status, processed_at
  )
  SELECT
    cse.organization_id,
    'cal_com',
    'booking.cancelled',
    json_build_object(
      'sync_event_id', p_sync_event_id,
      'reason', p_cancellation_reason
    )::jsonb,
    'success',
    now()
  FROM public.calendar_sync_events cse
  WHERE cse.id = p_sync_event_id;

  -- Realtime notification
  PERFORM pg_notify(
    'calendar_events',
    json_build_object(
      'event', 'event_cancelled',
      'sync_event_id', p_sync_event_id
    )::text
  );

  status := 'success';
  message := 'Event cancelled';
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.cancel_calendar_event(uuid, text)
  IS 'Cancel a synced calendar event and its associated meeting links';

GRANT EXECUTE ON FUNCTION public.cancel_calendar_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_calendar_event(uuid, text) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.3 GENERATE MEETING LINK — Create Zoom/Google Meet link for an event
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_meeting_link(
  p_sync_event_id  uuid,
  p_provider       text,
  p_host_email     text,
  p_guest_emails   text[]
)
RETURNS TABLE(meeting_id uuid, meeting_url text, status text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_title    text;
  v_event_start    timestamptz;
  v_event_end      timestamptz;
  v_event_tz       text;
  v_external_id    text;
  v_gen_meeting_id text;
  v_gen_meeting_url text;
  v_meeting_link_id uuid;
BEGIN
  -- Fetch event details
  SELECT event_title, event_start, event_end, event_timezone, external_event_id
  INTO v_event_title, v_event_start, v_event_end, v_event_tz, v_external_id
  FROM public.calendar_sync_events
  WHERE id = p_sync_event_id;

  IF NOT FOUND THEN
    meeting_id := NULL;
    meeting_url := NULL;
    status := 'error';
    message := 'Sync event not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Validate provider
  IF p_provider NOT IN ('zoom', 'google_meet') THEN
    meeting_id := NULL;
    meeting_url := NULL;
    status := 'error';
    message := 'Unsupported provider. Use zoom or google_meet';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Generate provider-specific meeting link
  IF p_provider = 'zoom' THEN
    -- Generate a Zoom-style meeting ID and URL
    -- In production, call Zoom API via HTTP extension or Edge Function
    v_gen_meeting_id := 'zoom_' || replace(gen_random_uuid()::text, '-', '');
    v_gen_meeting_url := 'https://zoom.us/j/' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10);
  ELSIF p_provider = 'google_meet' THEN
    -- Generate a Google Meet-style code
    -- In production, call Google Calendar API via HTTP extension or Edge Function
    v_gen_meeting_id := 'gmeet_' || replace(gen_random_uuid()::text, '-', '');
    v_gen_meeting_url := 'https://meet.google.com/' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12);
  END IF;

  -- Insert meeting link record
  INSERT INTO public.meeting_links (
    calendar_sync_event_id, provider, meeting_id, meeting_url,
    host_email, guest_emails, status
  ) VALUES (
    p_sync_event_id, p_provider, v_gen_meeting_id, v_gen_meeting_url,
    p_host_email, p_guest_emails, 'active'
  )
  RETURNING id INTO v_meeting_link_id;

  -- Update sync event with meeting link info
  UPDATE public.calendar_sync_events
  SET meeting_link_type     = p_provider,
      meeting_link_url      = v_gen_meeting_url,
      meeting_link_provider = p_provider,
      updated_at            = now()
  WHERE id = p_sync_event_id;

  -- Realtime notification
  PERFORM pg_notify(
    'calendar_events',
    json_build_object(
      'event', 'meeting_link_generated',
      'sync_event_id', p_sync_event_id,
      'provider', p_provider,
      'meeting_url', v_gen_meeting_url
    )::text
  );

  meeting_id := v_meeting_link_id;
  meeting_url := v_gen_meeting_url;
  status := 'success';
  message := 'Meeting link generated';
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.generate_meeting_link(uuid, text, text, text[])
  IS 'Generate a Zoom or Google Meet link for a synced calendar event. In production, delegate to Edge Function for real API calls.';

GRANT EXECUTE ON FUNCTION public.generate_meeting_link(uuid, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_meeting_link(uuid, text, text, text[]) TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 5.4 GET ORG CALENDAR EVENTS — Query events for an org within date range
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_org_calendar_events(
  p_org_id     uuid,
  p_from_date  timestamptz,
  p_to_date    timestamptz
)
RETURNS TABLE(
  sync_event_id     uuid,
  event_title       text,
  event_start       timestamptz,
  event_end         timestamptz,
  location          text,
  meeting_link_url  text,
  meeting_link_type text,
  attendees         jsonb,
  sync_status       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cse.id,
    cse.event_title,
    cse.event_start,
    cse.event_end,
    cse.location,
    cse.meeting_link_url,
    cse.meeting_link_type,
    cse.attendees,
    cse.sync_status
  FROM public.calendar_sync_events cse
  WHERE cse.organization_id = p_org_id
    AND cse.event_start >= p_from_date
    AND cse.event_end <= p_to_date
    AND cse.sync_status != 'cancelled'
  ORDER BY cse.event_start ASC;
END;
$$;

COMMENT ON FUNCTION public.get_org_calendar_events(uuid, timestamptz, timestamptz)
  IS 'Returns non-cancelled calendar sync events for an org within a date range';

GRANT EXECUTE ON FUNCTION public.get_org_calendar_events(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_calendar_events(uuid, timestamptz, timestamptz) TO service_role;

COMMIT;
