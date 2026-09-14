-- Migration: Create group_conversations table for social/group chat
-- Used by: groupChatClient.ts, socialClient.ts, scheduleClient.ts
-- Tenant-scoped, supports scheduled events for the master schedule

CREATE TABLE IF NOT EXISTS public.group_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'social',  -- social | study | announcement
  type            TEXT NOT NULL DEFAULT 'group',    -- group | channel
  lead            TEXT,                             -- group lead / teacher name
  description     TEXT,
  rules           TEXT[] DEFAULT '{}',
  member_count    INTEGER NOT NULL DEFAULT 0,
  last_message    TEXT,
  scheduled_event TIMESTAMPTZ,                      -- for master schedule aggregation
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
