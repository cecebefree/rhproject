-- Migration 134: Contact Notes, Mentions, Attachments, Activity Log
-- Row 8: Contact Notes — rich text notes, @mentions, file attachments, activity timeline

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- CONTACT NOTES — rich text notes on contacts
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.contact_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid NOT NULL REFERENCES office_desk.contacts(id) ON DELETE CASCADE,
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  created_by        uuid NOT NULL REFERENCES auth.users(id),
  content           text NOT NULL,
  content_html      text,
  is_edited         boolean DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON office_desk.contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_desk_id ON office_desk.contact_notes(desk_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_tenant_id ON office_desk.contact_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created_by ON office_desk.contact_notes(created_by);

-- ═══════════════════════════════════════════════════════════
-- CONTACT NOTE MENTIONS — @mentions in notes
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.contact_note_mentions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id           uuid NOT NULL REFERENCES office_desk.contact_notes(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  mentioned_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_note_mentions_note_id ON office_desk.contact_note_mentions(note_id);
CREATE INDEX IF NOT EXISTS idx_contact_note_mentions_user_id ON office_desk.contact_note_mentions(user_id);

-- ═══════════════════════════════════════════════════════════
-- CONTACT NOTE ATTACHMENTS — file attachments on notes
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.contact_note_attachments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id           uuid NOT NULL REFERENCES office_desk.contact_notes(id) ON DELETE CASCADE,
  file_name         text NOT NULL,
  file_size         integer,
  file_type         text,
  file_url          text NOT NULL,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_note_attachments_note_id ON office_desk.contact_note_attachments(note_id);

-- ═══════════════════════════════════════════════════════════
-- CONTACT ACTIVITY LOG — audit trail for contact changes
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_desk.contact_activity_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid NOT NULL REFERENCES office_desk.contacts(id) ON DELETE CASCADE,
  desk_id           uuid NOT NULL REFERENCES office_desk.office_desk(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  action            varchar(50) NOT NULL,
  action_data       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_activity_log_contact_id ON office_desk.contact_activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_log_desk_id ON office_desk.contact_activity_log(desk_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_log_created_at ON office_desk.contact_activity_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE office_desk.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.contact_note_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.contact_note_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_desk.contact_activity_log ENABLE ROW LEVEL SECURITY;

-- contact_notes: users can access notes on their desk
CREATE POLICY "contact_notes_select" ON office_desk.contact_notes
  FOR SELECT USING (
    desk_id IN (
      SELECT ud.desk_id FROM office_desk.user_desks ud
      WHERE ud.user_id = auth.uid()
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

CREATE POLICY "contact_notes_insert" ON office_desk.contact_notes
  FOR INSERT WITH CHECK (
    desk_id IN (
      SELECT ud.desk_id FROM office_desk.user_desks ud
      WHERE ud.user_id = auth.uid()
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
    AND created_by = auth.uid()
  );

CREATE POLICY "contact_notes_update" ON office_desk.contact_notes
  FOR UPDATE USING (
    desk_id IN (
      SELECT ud.desk_id FROM office_desk.user_desks ud
      WHERE ud.user_id = auth.uid()
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

CREATE POLICY "contact_notes_delete" ON office_desk.contact_notes
  FOR DELETE USING (
    desk_id IN (
      SELECT ud.desk_id FROM office_desk.user_desks ud
      WHERE ud.user_id = auth.uid()
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

-- contact_note_mentions: same desk access as parent note
CREATE POLICY "contact_note_mentions_select" ON office_desk.contact_note_mentions
  FOR SELECT USING (
    note_id IN (
      SELECT cn.id FROM office_desk.contact_notes cn
      WHERE cn.desk_id IN (
        SELECT ud.desk_id FROM office_desk.user_desks ud
        WHERE ud.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contact_note_mentions_insert" ON office_desk.contact_note_mentions
  FOR INSERT WITH CHECK (
    note_id IN (
      SELECT cn.id FROM office_desk.contact_notes cn
      WHERE cn.desk_id IN (
        SELECT ud.desk_id FROM office_desk.user_desks ud
        WHERE ud.user_id = auth.uid()
      )
    )
  );

-- contact_note_attachments: same desk access as parent note
CREATE POLICY "contact_note_attachments_select" ON office_desk.contact_note_attachments
  FOR SELECT USING (
    note_id IN (
      SELECT cn.id FROM office_desk.contact_notes cn
      WHERE cn.desk_id IN (
        SELECT ud.desk_id FROM office_desk.user_desks ud
        WHERE ud.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contact_note_attachments_insert" ON office_desk.contact_note_attachments
  FOR INSERT WITH CHECK (
    note_id IN (
      SELECT cn.id FROM office_desk.contact_notes cn
      WHERE cn.desk_id IN (
        SELECT ud.desk_id FROM office_desk.user_desks ud
        WHERE ud.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contact_note_attachments_delete" ON office_desk.contact_note_attachments
  FOR DELETE USING (
    note_id IN (
      SELECT cn.id FROM office_desk.contact_notes cn
      WHERE cn.desk_id IN (
        SELECT ud.desk_id FROM office_desk.user_desks ud
        WHERE ud.user_id = auth.uid()
      )
    )
  );

-- contact_activity_log: same desk access
CREATE POLICY "contact_activity_log_select" ON office_desk.contact_activity_log
  FOR SELECT USING (
    desk_id IN (
      SELECT ud.desk_id FROM office_desk.user_desks ud
      WHERE ud.user_id = auth.uid()
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
  );

CREATE POLICY "contact_activity_log_insert" ON office_desk.contact_activity_log
  FOR INSERT WITH CHECK (
    desk_id IN (
      SELECT ud.desk_id FROM office_desk.user_desks ud
      WHERE ud.user_id = auth.uid()
    )
    AND tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid)
    AND user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════
-- TRIGGERS — auto-log activity on note changes
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.log_contact_note_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO office_desk.contact_activity_log (contact_id, desk_id, tenant_id, user_id, action, action_data)
    VALUES (
      NEW.contact_id,
      NEW.desk_id,
      NEW.tenant_id,
      NEW.created_by,
      'note_created',
      jsonb_build_object('note_id', NEW.id, 'preview', left(NEW.content, 100))
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO office_desk.contact_activity_log (contact_id, desk_id, tenant_id, user_id, action, action_data)
    VALUES (
      NEW.contact_id,
      NEW.desk_id,
      NEW.tenant_id,
      NEW.created_by,
      'note_updated',
      jsonb_build_object('note_id', NEW.id)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO office_desk.contact_activity_log (contact_id, desk_id, tenant_id, user_id, action, action_data)
    VALUES (
      OLD.contact_id,
      OLD.desk_id,
      OLD.tenant_id,
      auth.uid(),
      'note_deleted',
      jsonb_build_object('note_id', OLD.id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contact_note_activity ON office_desk.contact_notes;
CREATE TRIGGER trg_contact_note_activity
  AFTER INSERT OR UPDATE OR DELETE ON office_desk.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.log_contact_note_activity();

-- Trigger to auto-update updated_at on contact_notes
CREATE OR REPLACE FUNCTION office_desk.update_contact_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.is_edited = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_notes_updated_at ON office_desk.contact_notes;
CREATE TRIGGER trg_contact_notes_updated_at
  BEFORE UPDATE ON office_desk.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_contact_notes_timestamp();

-- ═══════════════════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.contact_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.contact_activity_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
