-- Migration: School Desk Communications
-- Tables: school_desk.communications (calls, emails), school_desk.meetings (online meetings)
-- Only enrolled profiles can be contacted

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- COMMUNICATIONS TABLE (calls + emails)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.communications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_lms(id),
  comm_type       text NOT NULL CHECK (comm_type IN ('call', 'email')),
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Recipient/Sender (must be enrolled profile)
  profile_id      uuid NOT NULL REFERENCES public.profiles(id),

  -- Call fields
  call_duration   int,           -- seconds
  call_outcome    text CHECK (call_outcome IN ('answered', 'missed', 'voicemail', 'busy', 'no_answer')),
  call_notes      text,

  -- Email fields
  email_subject   text,
  email_body      text,
  email_from      text,
  email_to        text,
  email_status    text CHECK (email_status IN ('draft', 'sent', 'delivered', 'failed', 'read')),
  email_read_at   timestamptz,

  -- Metadata
  metadata        jsonb DEFAULT '{}',
  recorded_by     uuid REFERENCES public.profiles(id),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communications_tenant ON school_desk.communications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_communications_profile ON school_desk.communications (tenant_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON school_desk.communications (tenant_id, comm_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_inbound ON school_desk.communications (tenant_id, direction, created_at DESC) WHERE direction = 'inbound';

-- ═══════════════════════════════════════════════════════════
-- MEETINGS TABLE (online meeting schedules)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.meetings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenant_lms(id),

  -- Meeting details
  title           text NOT NULL,
  description     text,
  meeting_type    text NOT NULL CHECK (meeting_type IN ('video', 'phone', 'in_person')),
  meeting_url     text,          -- Zoom/Meet/Teams link
  meeting_id      text,          -- External meeting ID
  meeting_pass    text,          -- Meeting password

  -- Schedule
  scheduled_at    timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  timezone        text DEFAULT 'Africa/Johannesburg',

  -- Participants (enrolled profiles only)
  organizer_id    uuid NOT NULL REFERENCES public.profiles(id),
  max_participants int DEFAULT 15,

  -- Status
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),

  -- Recurrence
  recurrence      text CHECK (recurrence IN ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_end  timestamptz,

  -- Metadata
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_tenant ON school_desk.meetings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON school_desk.meetings (tenant_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON school_desk.meetings (tenant_id, status, scheduled_at DESC);

-- ═══════════════════════════════════════════════════════════
-- MEETING PARTICIPANTS (enrolled profiles only)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_desk.meeting_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid NOT NULL REFERENCES school_desk.meetings(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id),
  status          text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'tentative', 'attended')),
  responded_at    timestamptz,
  joined_at       timestamptz,
  left_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (meeting_id, profile_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON school_desk.meeting_participants (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_profile ON school_desk.meeting_participants (profile_id);

-- ═══════════════════════════════════════════════════════════
-- ENABLE RLS
-- ═══════════════════════════════════════════════════════════
ALTER TABLE school_desk.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_desk.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_desk.meeting_participants ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES: COMMUNICATIONS
-- ═══════════════════════════════════════════════════════════

-- Admin/teacher: full access within tenant
CREATE POLICY comm_admin_teacher_all ON school_desk.communications
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
    )
  )
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
    )
  );

-- Students/parents: read only their own communications
CREATE POLICY comm_profile_select ON school_desk.communications
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND profile_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES: MEETINGS
-- ═══════════════════════════════════════════════════════════

-- Admin/teacher: full access within tenant
CREATE POLICY meetings_admin_teacher_all ON school_desk.meetings
  FOR ALL TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
    )
  )
  WITH CHECK (
    tenant_id = jwt_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
    )
  );

-- Participants: read meetings they're invited to
CREATE POLICY meetings_participant_select ON school_desk.meetings
  FOR SELECT TO authenticated
  USING (
    tenant_id = jwt_tenant_id()
    AND (
      organizer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM school_desk.meeting_participants mp
        WHERE mp.meeting_id = meetings.id AND mp.profile_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES: MEETING PARTICIPANTS
-- ═══════════════════════════════════════════════════════════

-- Admin/teacher: manage participants
CREATE POLICY mp_admin_teacher_all ON school_desk.meeting_participants
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_desk.meetings m
      WHERE m.id = meeting_participants.meeting_id
      AND m.tenant_id = jwt_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM school_desk.meetings m
      WHERE m.id = meeting_participants.meeting_id
      AND m.tenant_id = jwt_tenant_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher')
      )
    )
  );

-- Participants: read own participation
CREATE POLICY mp_profile_select ON school_desk.meeting_participants
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE ON school_desk.communications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON school_desk.meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON school_desk.meeting_participants TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION school_desk.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_communications_updated_at
  BEFORE UPDATE ON school_desk.communications
  FOR EACH ROW EXECUTE FUNCTION school_desk.set_updated_at();

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON school_desk.meetings
  FOR EACH ROW EXECUTE FUNCTION school_desk.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════
COMMENT ON TABLE school_desk.communications IS 'School Desk communications: internal calls and emails to enrolled profiles';
COMMENT ON COLUMN school_desk.communications.comm_type IS 'Type: call or email';
COMMENT ON COLUMN school_desk.communications.direction IS 'Direction: inbound (received) or outbound (sent)';
COMMENT ON COLUMN school_desk.communications.profile_id IS 'The enrolled profile this communication is with';

COMMENT ON TABLE school_desk.meetings IS 'School Desk online meeting schedules (max 15 participants)';
COMMENT ON COLUMN school_desk.meetings.max_participants IS 'Maximum participants: 15 for online meetings';
COMMENT ON COLUMN school_desk.meetings.meeting_url IS 'Video meeting link (Zoom, Google Meet, Teams)';

COMMIT;
