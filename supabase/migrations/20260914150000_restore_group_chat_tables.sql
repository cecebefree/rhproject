-- Migration 20260914150000: Restore group_conversations and group_messages
-- with correct schema for mobile chat functionality
-- Previous tables were dropped by 20260914142743_remote_schema.sql
-- Columns match what groupChatClient.ts, socialClient.ts, scheduleClient.ts expect

begin;

-- 1. Restore group_conversations
CREATE TABLE IF NOT EXISTS public.group_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'social',
  type            TEXT NOT NULL DEFAULT 'group',
  lead            TEXT,
  description     TEXT,
  rules           TEXT[] DEFAULT '{}',
  member_count    INTEGER NOT NULL DEFAULT 0,
  last_message    TEXT,
  scheduled_event TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_conversations ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY gc_admin_all ON public.group_conversations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.tenant_id = group_conversations.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.tenant_id = group_conversations.tenant_id
    )
  );

-- Teacher: read groups in their tenant
CREATE POLICY gc_teacher_read ON public.group_conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.tenant_id = group_conversations.tenant_id
    )
  );

-- Student: read groups in their tenant
CREATE POLICY gc_student_read ON public.group_conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'student'
        AND p.tenant_id = group_conversations.tenant_id
    )
  );

-- Adult: read groups in their tenant
CREATE POLICY gc_adult_read ON public.group_conversations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'adult'
        AND p.tenant_id = group_conversations.tenant_id
    )
  );

CREATE TRIGGER trg_group_conversations_updated_at
  BEFORE UPDATE ON public.group_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_conversations TO authenticated;

-- 2. Restore group_messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id),
  sender_name   TEXT,
  sender_handle TEXT,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_group_messages_group_id ON public.group_messages (group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages (created_at);

-- Admin: full access
CREATE POLICY gm_admin_all ON public.group_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Member read: read messages in groups belonging to their tenant
CREATE POLICY gm_member_read ON public.group_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_conversations gc
      WHERE gc.id = group_messages.group_id
        AND gc.tenant_id = (
          SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
    )
  );

-- Member insert: send messages in groups belonging to their tenant
CREATE POLICY gm_member_insert ON public.group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_conversations gc
      WHERE gc.id = group_messages.group_id
        AND gc.tenant_id = (
          SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
    )
  );

GRANT SELECT, INSERT ON public.group_messages TO authenticated;

-- 3. Restore clubs (also dropped by remote_schema.sql)
CREATE TABLE IF NOT EXISTS public.clubs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT DEFAULT 'club',
  lead         TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY clubs_read ON public.clubs
  FOR SELECT TO authenticated
  USING (tenant_id = (
    SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;

commit;