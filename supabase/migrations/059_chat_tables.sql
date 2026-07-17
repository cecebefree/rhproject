-- 059: Chat tables (conversations, conversation_members, messages,
--      message_reactions, chat_preferences)
-- Per Ruling R20 auth-first doctrine: authorization before existence
-- check; tenant isolation via the JWT tenant claim. Membership in
-- conversation_members gates read and write on messages and reactions.
-- conversations.category is display-only. messages.deleted_at is a
-- soft delete; no hard DELETE policy for non-senders.
-- Handle scope (profiles.handle, handle_changes) is NOT in this file.
-- RLS note: conversation_members policies deliberately do NOT reference
-- conversations, to avoid a recursive RLS cycle (conversations RLS
-- scans conversation_members; conv_members RLS must not scan conversations).

begin;

-- 1. conversations
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  category    text not null default 'general',
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_conversations_tenant on public.conversations (tenant_id);

-- 2. conversation_members (no tenant_id column; tenant enforced via conversations)
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  role            text not null default 'member',
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

create index idx_conv_members_profile on public.conversation_members (profile_id);

-- 3. messages
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  check (length(body) > 0)
);

create index idx_messages_conversation on public.messages (conversation_id);

-- 4. message_reactions
create table public.message_reactions (
  message_id  uuid not null references public.messages(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  primary key (message_id, profile_id, emoji)
);

create index idx_msg_reactions_profile on public.message_reactions (profile_id);

-- 5. chat_preferences
create table public.chat_preferences (
  profile_id           uuid primary key references public.profiles(id) on delete cascade,
  muted_conversations  uuid[] not null default '{}',
  notification_level   text not null default 'all' check (notification_level in ('all','mentions','none')),
  updated_at           timestamptz not null default now()
);

-- 6. Enable row level security on all five tables
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages            enable row level security;
alter table public.message_reactions    enable row level security;
alter table public.chat_preferences     enable row level security;

-- 7. RLS policies (auth-first; no recursive cross-scan between
--    conversations and conversation_members)
create policy conversations_tenant_read on public.conversations
  for select to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and (
      exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = conversations.id
          and cm.profile_id = auth.uid()
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          and p.role = 'admin'
      )
    )
  );

-- conversations write: members only (no recursion; conv_members RLS
-- is profile_id-gated). Tenant isolation already enforced on read.
create policy conversations_member_write on public.conversations
  for all to authenticated
  using (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.profile_id = auth.uid()
    )
  )
  with check (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.profile_id = auth.uid()
    )
  );

-- conversation_members: profile_id-gated only (no conversations scan).
create policy conv_members_self_read on public.conversation_members
  for select to authenticated
  using (profile_id = auth.uid());

create policy conv_members_self_write on public.conversation_members
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- messages: tenant-isolated via conversations; readable by conversation
-- members; writable by members (soft delete via update, no DELETE policy).
create policy messages_tenant_read on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.profile_id = auth.uid()
    )
  );

create policy messages_member_write on public.messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    and sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.profile_id = auth.uid()
    )
  );

create policy messages_sender_update on public.messages
  for update to authenticated
  using (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  )
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- no DELETE policy: non-senders cannot hard-delete; soft delete via update

-- message_reactions: tenant-isolated; members react; self-manage
create policy reactions_tenant_read on public.message_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_reactions.message_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    and exists (
      select 1 from public.messages m
      join public.conversation_members cm on cm.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id
        and cm.profile_id = auth.uid()
    )
  );

create policy reactions_self_write on public.message_reactions
  for all to authenticated
  using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_reactions.message_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    and profile_id = auth.uid()
  )
  with check (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_reactions.message_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    and profile_id = auth.uid()
  );

-- chat_preferences: keyed on profile_id; own row only
create policy chat_prefs_self_read on public.chat_preferences
  for select to authenticated
  using (profile_id = auth.uid());

create policy chat_prefs_self_write on public.chat_preferences
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- 8. updated_at triggers (reuse set_updated_at from 019)
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create trigger trg_chat_preferences_updated_at
  before update on public.chat_preferences
  for each row execute function public.set_updated_at();

-- 9. Grants (RLS policies gate access; grants enable the delivery path)
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_members to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.message_reactions to authenticated;
grant select, insert, update, delete on public.chat_preferences to authenticated;

commit;
