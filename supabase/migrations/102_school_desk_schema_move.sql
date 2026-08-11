-- Migration 102: Move school tables to school_desk schema (Row 54)
-- 7 tables: courses, enrollments, report_cards, announcement,
--           conversations, conversation_members, messages
-- RLS policies move automatically with ALTER TABLE ... SET SCHEMA
-- get_announcements() RPC fix: deferred (requires new item)
-- PostgREST exposure: config.toml update required (outside SQL)

BEGIN;

ALTER TABLE public.courses SET SCHEMA school_desk;
ALTER TABLE public.enrollments SET SCHEMA school_desk;
ALTER TABLE public.report_cards SET SCHEMA school_desk;
ALTER TABLE public.announcement SET SCHEMA school_desk;
ALTER TABLE public.conversations SET SCHEMA school_desk;
ALTER TABLE public.conversation_members SET SCHEMA school_desk;
ALTER TABLE public.messages SET SCHEMA school_desk;

COMMIT;
