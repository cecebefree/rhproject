-- D28: Add media_enabled to conversations
-- Per ITEM-001: media dial backing field, demo default = text+emoji only

begin;

alter table school_desk.conversations
  add column media_enabled boolean not null default false;

comment on column school_desk.conversations.media_enabled is
  'Media dial per ITEM-001 S2. false = text+emoji only (demo default). true = image/video/attachment enabled.';

commit;
