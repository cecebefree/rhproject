-- Migration 188: calendar.organization_id -> calendar.tenant_id
-- Renames organization_id to tenant_id across calendar, calendar_sync_events,
-- and calendar_webhook_logs. FK target stays supabase.organizations.
-- Also updates 4 functions that reference the old column name.

BEGIN;

-- 1. Rename columns
ALTER TABLE public.calendar RENAME COLUMN organization_id TO tenant_id;
ALTER TABLE public.calendar_sync_events RENAME COLUMN organization_id TO tenant_id;
ALTER TABLE public.calendar_webhook_logs RENAME COLUMN organization_id TO tenant_id;

-- 2. Rename indexes
DROP INDEX IF EXISTS idx_calendar_organization;
CREATE INDEX IF NOT EXISTS idx_calendar_tenant ON public.calendar (tenant_id);

DROP INDEX IF EXISTS idx_sync_events_org;
CREATE INDEX IF NOT EXISTS idx_sync_events_tenant ON public.calendar_sync_events (tenant_id);

DROP INDEX IF EXISTS idx_webhook_logs_org;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant ON public.calendar_webhook_logs (tenant_id);

-- 3. Rename RLS policies on calendar
DROP POLICY IF EXISTS calendar_org_read ON public.calendar;
DROP POLICY IF EXISTS calendar_org_all ON public.calendar;

CREATE POLICY calendar_tenant_read ON public.calendar
  FOR SELECT USING (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  );

CREATE POLICY calendar_tenant_all ON public.calendar
  FOR ALL USING (
    tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  );

-- 4. organization_id values are already correct tenant IDs (they reference
--    supabase.organizations). No backfill needed — just ensure NOT NULL.
--    (column was already NOT NULL, but guard for safety)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.calendar WHERE tenant_id IS NULL LIMIT 1) THEN
    UPDATE public.calendar SET tenant_id = 'e227c1c6-b79d-43f1-b36d-89e71e509080'::uuid WHERE tenant_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.calendar ALTER COLUMN tenant_id SET NOT NULL;

-- 7. Restore FK constraints
ALTER TABLE public.calendar DROP CONSTRAINT IF EXISTS calendar_organization_id_fkey;
ALTER TABLE public.calendar ADD CONSTRAINT calendar_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES supabase.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_sync_events DROP CONSTRAINT IF EXISTS calendar_sync_events_organization_id_fkey;
ALTER TABLE public.calendar_sync_events ADD CONSTRAINT calendar_sync_events_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES supabase.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_webhook_logs DROP CONSTRAINT IF EXISTS calendar_webhook_logs_organization_id_fkey;
ALTER TABLE public.calendar_webhook_logs ADD CONSTRAINT calendar_webhook_logs_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES supabase.organizations(id) ON DELETE CASCADE;

-- 8. Update handle_calendar_slot_booking trigger function
CREATE OR REPLACE FUNCTION public.handle_calendar_slot_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.booking_status = 'booked' AND (OLD.booking_status IS DISTINCT FROM 'booked') THEN
    INSERT INTO public.schedule_slot_bookings (
      calendar_id, schedule_slot_id, tenant_id, booked_by
    ) VALUES (
      NEW.id, NEW.booked_slot_id, NEW.tenant_id, NEW.booked_by
    );
  ELSIF NEW.booking_status IS DISTINCT FROM 'booked' AND OLD.booking_status = 'booked' THEN
    DELETE FROM public.schedule_slot_bookings WHERE calendar_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 9. Update generate_calendar_slots (was: organization_id)
CREATE OR REPLACE FUNCTION public.generate_calendar_slots(
  p_org_id           uuid,
  p_grade            text,
  p_num_slots         int,
  p_start_date       date,
  p_slot_time        time DEFAULT '14:00',
  p_duration_minutes int DEFAULT 60,
  p_capacity         int DEFAULT 5
)
RETURNS TABLE(slot_id uuid, slot_date date, slot_time time, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_i int;
  v_date date;
BEGIN
  FOR v_i IN 0 .. (p_num_slots - 1) LOOP
    v_date := p_start_date + (v_i || ' days')::interval;

    INSERT INTO public.calendar (
      tenant_id, grade, slot_date, slot_time, duration_minutes,
      capacity, available_slots, booked_slots, status, created_by
    ) VALUES (
      p_org_id, p_grade, v_date, p_slot_time, p_duration_minutes,
      p_capacity, p_capacity, 0, 'open', auth.uid()
    )
    RETURNING id, slot_date, slot_time, status INTO slot_id, slot_date, slot_time, status;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- 10. Update sync_calendar_event (was: organization_id)
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
  SELECT id INTO v_existing_id
  FROM public.calendar_sync_events
  WHERE external_event_id = p_external_event_id;

  IF FOUND THEN
    UPDATE public.calendar_sync_events
    SET event_title = p_event_title, event_description = p_event_description,
        event_start = p_event_start, event_end = p_event_end,
        event_timezone = p_event_timezone, location = p_location,
        attendees = p_attendees, external_updated_at = p_external_updated_at,
        last_synced_at = now(), updated_at = now()
    WHERE id = v_existing_id;
    v_event_type := 'booking.updated';
    sync_event_id := v_existing_id;
  ELSE
    INSERT INTO public.calendar_sync_events (
      tenant_id, calendar_id, external_event_id, event_title, event_description,
      event_start, event_end, event_timezone, location, attendees,
      meeting_link_type, sync_status
    ) VALUES (
      p_org_id, p_calendar_id, p_external_event_id, p_event_title, p_event_description,
      p_event_start, p_event_end, p_event_timezone, p_location, p_attendees,
      p_meeting_link_type, 'synced')
    RETURNING id INTO sync_event_id;
    v_event_type := 'booking.created';
  END IF;

  INSERT INTO public.calendar_webhook_logs (
    tenant_id, webhook_source, webhook_event_type, webhook_payload, processing_status, processed_at
  ) VALUES (
    p_org_id, 'cal_com', v_event_type,
    json_build_object('external_event_id', p_external_event_id, 'event_title', p_event_title,
      'event_start', p_event_start, 'event_end', p_event_end)::jsonb,
    'success', now());

  PERFORM pg_notify('calendar_events',
    json_build_object('event', 'event_synced', 'sync_event_id', sync_event_id, 'org_id', p_org_id)::text);

  status := 'success';
  message := 'Event synced';
  RETURN NEXT;
END;
$$;

-- 11. Update get_org_calendar_events (was: organization_id)
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
  SELECT cse.id, cse.event_title, cse.event_start, cse.event_end,
         cse.location, cse.meeting_link_url, cse.meeting_link_type,
         cse.attendees, cse.sync_status
  FROM public.calendar_sync_events cse
  WHERE cse.tenant_id = p_org_id
    AND cse.event_start >= p_from_date
    AND cse.event_end <= p_to_date
    AND cse.sync_status != 'cancelled'
  ORDER BY cse.event_start ASC;
END;
$$;

-- 12. Update get_available_slots (was: c.organization_id)
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_org_id    uuid,
  p_grade     text,
  p_from_date date,
  p_to_date   date
)
RETURNS TABLE(
  id               uuid,
  slot_date        date,
  slot_time        time,
  duration_minutes int,
  available_slots  int,
  capacity         int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.slot_date, c.slot_time, c.duration_minutes,
         c.available_slots, c.capacity
  FROM public.calendar c
  WHERE c.tenant_id = p_org_id
    AND c.grade = p_grade
    AND c.slot_date BETWEEN p_from_date AND p_to_date
    AND c.status = 'open'
    AND c.available_slots > 0;
END;
$$;

COMMIT;
