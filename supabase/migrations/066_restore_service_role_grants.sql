-- 066_restore_service_role_grants.sql
-- Restore service_role grants for Edge Function profile/tenant access.
-- Root cause: service_role database role had no SELECT/UPDATE/INSERT on public tables.
-- EFs using service_role client (set_handle, assign_tenant, release_report_card, etc.)
-- require these grants to read/write application tables.

-- profiles: SELECT (caller/target lookup), UPDATE (handle change), INSERT (audit write via service role)
GRANT SELECT, UPDATE, INSERT ON public.profiles TO service_role;

-- handle_changes: INSERT (audit log from set_handle EF)
GRANT INSERT ON public.handle_changes TO service_role;

-- tenant tables: SELECT (tenant resolution in EFs)
GRANT SELECT ON public.tenant_devotional TO service_role;
GRANT SELECT ON public.tenant_lms TO service_role;
GRANT SELECT ON public.tenant_mobile TO service_role;

-- student_class: SELECT/UPDATE (class assignments via EFs)
GRANT SELECT, UPDATE ON public.student_class TO service_role;

-- certificates: SELECT (certificate queries)
GRANT SELECT ON public.certificates TO service_role;

-- report_cards: SELECT/INSERT (release-report-card EF)
GRANT SELECT, INSERT ON public.report_cards TO service_role;

-- courses, chapters: SELECT (course/chapter reads)
GRANT SELECT ON public.courses TO service_role;
GRANT SELECT ON public.chapters TO service_role;

-- enrollments: SELECT (enrollment checks)
GRANT SELECT ON public.enrollments TO service_role;

-- chapter_progress: SELECT/INSERT/UPDATE (progress tracking)
GRANT SELECT, INSERT, UPDATE ON public.chapter_progress TO service_role;

-- notifications: INSERT (notification writes from EFs)
GRANT INSERT ON public.notifications TO service_role;

-- enrichment_meta, schedule_slot: SELECT (schedule/enrichment reads)
GRANT SELECT ON public.enrichment_meta TO service_role;
GRANT SELECT ON public.schedule_slot TO service_role;

-- conversations, conversation_members, messages, chat_preferences: SELECT/INSERT (chat EFs)
GRANT SELECT, INSERT ON public.conversations TO service_role;
GRANT SELECT, INSERT ON public.conversation_members TO service_role;
GRANT SELECT, INSERT ON public.messages TO service_role;
GRANT SELECT ON public.chat_preferences TO service_role;

-- consent_records, suppression_records: SELECT/INSERT (consent/suppression EFs)
GRANT SELECT, INSERT ON public.consent_records TO service_role;
GRANT SELECT, INSERT ON public.suppression_records TO service_role;

-- family_child: SELECT (family linkage reads)
GRANT SELECT ON public.family_child TO service_role;

-- platform_access: SELECT (platform access checks)
GRANT SELECT ON public.platform_access TO service_role;

-- devotional_config, devotional_item: SELECT
GRANT SELECT ON public.devotional_config TO service_role;
GRANT SELECT ON public.devotional_item TO service_role;

-- terms: SELECT
GRANT SELECT ON public.terms TO service_role;