-- Migration: 20260905080000_revoke_anon_grants.sql
-- Revoke overly broad anon GRANTs on sensitive public tables
-- RLS already blocks access, but GRANTs should be tightened for defense-in-depth

BEGIN;

-- ============================================================================
-- SENSITIVE DATA: Revoke all anon access (RLS policies handle authenticated access)
-- ============================================================================

-- User data
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.students FROM anon;
REVOKE ALL ON public.parents FROM anon;
REVOKE ALL ON public.family_child FROM anon;
REVOKE ALL ON public.parent_student_link FROM anon;

-- Financial data
REVOKE ALL ON public.payments FROM anon;
REVOKE ALL ON public.invoices FROM anon;
REVOKE ALL ON public.contracts FROM anon;
REVOKE ALL ON public.debit_orders FROM anon;
REVOKE ALL ON public.debit_order_history FROM anon;
REVOKE ALL ON public.payment_history_view FROM anon;

-- School data
REVOKE ALL ON public.certificates FROM anon;
REVOKE ALL ON public.chapters FROM anon;
REVOKE ALL ON public.chapter_progress FROM anon;
REVOKE ALL ON public.student_class FROM anon;
REVOKE ALL ON public.student_history FROM anon;
REVOKE ALL ON public.staff_course FROM anon;
REVOKE ALL ON public.staff_profiles FROM anon;
REVOKE ALL ON public.schedule_slot FROM anon;
REVOKE ALL ON public.capacity_slots FROM anon;

-- Communication
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.notification_types FROM anon;
REVOKE ALL ON public.notification_preferences FROM anon;
REVOKE ALL ON public.chat_preferences FROM anon;

-- System tables
REVOKE ALL ON public.audit_log FROM anon;
REVOKE ALL ON public.log_events FROM anon;
REVOKE ALL ON public.rate_limit_config FROM anon;
REVOKE ALL ON public.ef_call_log FROM anon;
REVOKE ALL ON public.handle_changes FROM anon;
REVOKE ALL ON public.consent_records FROM anon;
REVOKE ALL ON public.suppression_records FROM anon;
REVOKE ALL ON public.platform_access FROM anon;
REVOKE ALL ON public.role_feature_access FROM anon;
REVOKE ALL ON public.enrollment_leads FROM anon;
REVOKE ALL ON public.website_leads FROM anon;
REVOKE ALL ON public.enrichment_meta FROM anon;

-- ============================================================================
-- PUBLIC CONTENT: Keep SELECT for anon (website/mobile needs these)
-- ============================================================================

-- These tables remain publicly readable (anon SELECT only)
-- Revoke write access only
REVOKE INSERT, UPDATE, DELETE ON public.courses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.devotional_config FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.devotional_item FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.daily_verse FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bible_plan FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.book FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.booklist FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.booklist_item FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.vlog FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.video_of_day FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tenant_devotional FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tenant_lms FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tenant_mobile FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.terms FROM anon;

COMMIT;
