-- Migration: Create group_messages table for group chat messages
-- Used by: groupChatClient.ts
-- FK to group_conversations, tenant-scoped via group membership

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
