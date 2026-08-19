-- Migration 160: Front Desk trigger functions + seed data
-- Auto-updated_at, call logging trigger, and 3 counselor seed records

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- FIX: Remove FK on staff_profiles.id (allows synthetic seed IDs)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_id_fkey;

ALTER TABLE public.staff_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add user_id column for auth linking (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'staff_profiles'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.staff_profiles
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: auto-update updated_at on inquiries
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION front_desk.set_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fd_inquiries_updated_at ON front_desk.inquiries;
CREATE TRIGGER trg_fd_inquiries_updated_at
  BEFORE UPDATE ON front_desk.inquiries
  FOR EACH ROW EXECUTE FUNCTION front_desk.set_inquiries_updated_at();

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: log call to activity_log when call_ended_at changes
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION front_desk.log_call_to_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when call_ended_at is newly set (was NULL, now has value)
  IF OLD.call_ended_at IS NULL AND NEW.call_ended_at IS NOT NULL THEN
    INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
    VALUES (
      NEW.id,
      'front',
      'call_logged',
      NEW.call_ended_at,
      NEW.updated_by,
      jsonb_build_object(
        'duration', NEW.call_duration_seconds,
        'outcome', NEW.call_outcome,
        'started_at', NEW.call_started_at,
        'ended_at', NEW.call_ended_at,
        'phone', NEW.voip_number_called
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fd_call_logging ON front_desk.inquiries;
CREATE TRIGGER trg_fd_call_logging
  AFTER UPDATE ON front_desk.inquiries
  FOR EACH ROW EXECUTE FUNCTION front_desk.log_call_to_activity();

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: auto-log status changes to activity_log
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION front_desk.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.enrollment_status IS DISTINCT FROM NEW.enrollment_status THEN
    INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
    VALUES (
      NEW.id,
      'front',
      'status_updated',
      now(),
      NEW.updated_by,
      jsonb_build_object(
        'old_status', OLD.enrollment_status,
        'new_status', NEW.enrollment_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fd_status_change ON front_desk.inquiries;
CREATE TRIGGER trg_fd_status_change
  AFTER UPDATE ON front_desk.inquiries
  FOR EACH ROW EXECUTE FUNCTION front_desk.log_status_change();

-- ═══════════════════════════════════════════════════════════
-- SEED: 3 counselor staff_profiles
-- ═══════════════════════════════════════════════════════════

-- Counselor 1: Front Desk, London
INSERT INTO public.staff_profiles (id, name, role, desk, timezone, language, max_capacity)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Sarah Chen',
  'counselor',
  'front',
  'Europe/London',
  'en',
  10
) ON CONFLICT (id) DO NOTHING;

-- Counselor 2: Front Desk, New York
INSERT INTO public.staff_profiles (id, name, role, desk, timezone, language, max_capacity)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'James Rodriguez',
  'counselor',
  'front',
  'America/New_York',
  'en',
  10
) ON CONFLICT (id) DO NOTHING;

-- Counselor 3: Manager, Multi-desk
INSERT INTO public.staff_profiles (id, name, role, desk, timezone, language, max_capacity)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Amara Okafor',
  'manager',
  'front',
  'Africa/Lagos',
  'en',
  15
) ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED: 7 test inquiry records
-- ═══════════════════════════════════════════════════════════

-- 1. Maria Santos — London, hot lead, LMS
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  assigned_counselor_id, assigned_at, source
) VALUES (
  'maria.santos@email.com', 'Maria Santos', '+44987654321', 'United Kingdom', 'Europe/London', 'en',
  12, 'LMS', 'Interested in LMS for my daughter, looking for flexible learning options.',
  'hot_lead', 'UK-based parent, child age 12, LMS interest, high engagement', 'immediate_call',
  'a0000000-0000-0000-0000-000000000001', now(), 'website_form'
) ON CONFLICT (contact_email) DO NOTHING;

-- 2. James Wright — NYC, warm lead, Virtual Boarding
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  assigned_counselor_id, assigned_at, source
) VALUES (
  'james.wright@email.com', 'James Wright', '+12125551234', 'United States', 'America/New_York', 'en',
  14, 'Virtual Boarding', 'Exploring virtual boarding options for next academic year.',
  'warm', 'US-based parent, moderate urgency, needs follow-up', 'schedule_callback',
  'a0000000-0000-0000-0000-000000000002', now(), 'callback_request'
) ON CONFLICT (contact_email) DO NOTHING;

-- 3. Yuki Tanaka — Tokyo, nurture lead, LMS
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  source
) VALUES (
  'yuki.tanaka@email.com', 'Yuki Tanaka', '+81901234567', 'Japan', 'Asia/Tokyo', 'ja',
  10, 'LMS', 'Just browsing options for my son.',
  'nurture', 'Low urgency, browsing phase, nurture with email sequence', 'nurture_email',
  'website_form'
) ON CONFLICT (contact_email) DO NOTHING;

-- 4. Fatima Al-Hassan — Dubai, hot lead, Corporate Training
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  source
) VALUES (
  'fatima.hassan@corp.ae', 'Fatima Al-Hassan', '+971501234567', 'UAE', 'Asia/Dubai', 'en',
  NULL, 'Corporate Training', 'Need training platform for 200 employees, urgent rollout.',
  'hot_lead', 'Corporate buyer, high budget potential, immediate engagement needed', 'immediate_call',
  'manual'
) ON CONFLICT (contact_email) DO NOTHING;

-- 5. Carlos Mendez — Mexico City, warm lead, Virtual Boarding
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  source
) VALUES (
  'carlos.mendez@email.com', 'Carlos Mendez', '+525512345678', 'Mexico', 'America/Mexico_City', 'es',
  16, 'Virtual Boarding', 'My son is interested in international boarding programs.',
  'warm', 'International parent, moderate urgency, schedule callback in Spanish', 'schedule_callback',
  'chat'
) ON CONFLICT (contact_email) DO NOTHING;

-- 6. Emma Thompson — Sydney, nurture lead, LMS
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  source
) VALUES (
  'emma.thompson@email.com', 'Emma Thompson', '+61412345678', 'Australia', 'Australia/Sydney', 'en',
  8, 'LMS', 'Looking at options for younger children.',
  'nurture', 'Young child, low urgency, nurture with student stories', 'nurture_email',
  'website_form'
) ON CONFLICT (contact_email) DO NOTHING;

-- 7. Olga Petrov — Moscow, blocked lead, LMS
INSERT INTO front_desk.inquiries (
  contact_email, contact_name, contact_phone, country_residence, timezone, language,
  age_or_child_age, program_interest, message_body,
  ai_category, ai_reasoning, ai_suggested_action,
  source
) VALUES (
  'olga.petrov@email.com', 'Olga Petrov', '+79161234567', 'Russia', 'Europe/Moscow', 'ru',
  11, 'LMS', 'Is this available in Russia?',
  'blocked', 'Sanctions/compliance concern, hold for manual review', 'hold',
  'voip_incoming'
) ON CONFLICT (contact_email) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED: Activity log entries for test inquiries
-- ═══════════════════════════════════════════════════════════

-- Maria Santos: AI categorized + call logged
INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
SELECT id, 'front', 'ai_categorized', now() - interval '5 minutes', NULL,
  '{"category": "hot_lead", "reasoning": "UK-based parent, child age 12, LMS interest", "assigned_to": "Sarah Chen"}'::jsonb
FROM front_desk.inquiries WHERE contact_email = 'maria.santos@email.com'
AND NOT EXISTS (
  SELECT 1 FROM front_desk.activity_log
  WHERE inquiry_id = (SELECT id FROM front_desk.inquiries WHERE contact_email = 'maria.santos@email.com')
  AND action = 'ai_categorized'
);

INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
SELECT id, 'front', 'call_logged', now() - interval '3 minutes',
  (SELECT id FROM public.staff_profiles WHERE name = 'Sarah Chen' LIMIT 1),
  '{"duration": 1200, "outcome": "decision_yes", "notes": "Parent approved pricing, ready for enrollment"}'::jsonb
FROM front_desk.inquiries WHERE contact_email = 'maria.santos@email.com'
AND NOT EXISTS (
  SELECT 1 FROM front_desk.activity_log
  WHERE inquiry_id = (SELECT id FROM front_desk.inquiries WHERE contact_email = 'maria.santos@email.com')
  AND action = 'call_logged'
);

-- James Wright: AI categorized
INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
SELECT id, 'front', 'ai_categorized', now() - interval '15 minutes', NULL,
  '{"category": "warm", "reasoning": "US-based parent, moderate urgency", "assigned_to": "James Rodriguez"}'::jsonb
FROM front_desk.inquiries WHERE contact_email = 'james.wright@email.com'
AND NOT EXISTS (
  SELECT 1 FROM front_desk.activity_log
  WHERE inquiry_id = (SELECT id FROM front_desk.inquiries WHERE contact_email = 'james.wright@email.com')
  AND action = 'ai_categorized'
);

-- Fatima Al-Hassan: AI categorized + callback scheduled
INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
SELECT id, 'front', 'ai_categorized', now() - interval '30 minutes', NULL,
  '{"category": "hot_lead", "reasoning": "Corporate buyer, high budget", "assigned_to": "Amara Okafor"}'::jsonb
FROM front_desk.inquiries WHERE contact_email = 'fatima.hassan@corp.ae'
AND NOT EXISTS (
  SELECT 1 FROM front_desk.activity_log
  WHERE inquiry_id = (SELECT id FROM front_desk.inquiries WHERE contact_email = 'fatima.hassan@corp.ae')
  AND action = 'ai_categorized'
);

INSERT INTO front_desk.activity_log (inquiry_id, desk, action, timestamp, performed_by, data)
SELECT id, 'front', 'callback_scheduled', now() - interval '25 minutes',
  (SELECT id FROM public.staff_profiles WHERE name = 'Amara Okafor' LIMIT 1),
  '{"scheduled_at": "tomorrow 10am GST", "channel": "sms"}'::jsonb
FROM front_desk.inquiries WHERE contact_email = 'fatima.hassan@corp.ae'
AND NOT EXISTS (
  SELECT 1 FROM front_desk.activity_log
  WHERE inquiry_id = (SELECT id FROM front_desk.inquiries WHERE contact_email = 'fatima.hassan@corp.ae')
  AND action = 'callback_scheduled'
);

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON FUNCTION front_desk.set_inquiries_updated_at() IS 'Auto-set updated_at on inquiry updates';
COMMENT ON FUNCTION front_desk.log_call_to_activity() IS 'Log call completion to activity_log when call_ended_at is set';
COMMENT ON FUNCTION front_desk.log_status_change() IS 'Log enrollment_status changes to activity_log';

COMMIT;
