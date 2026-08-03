-- 086_normalize_jwt_tenant_id_helper.sql
-- Rewrites ALL auth.jwt() tenant_id readers to public.jwt_tenant_id()
--
-- Helper returns auth.jwt() -> 'app_metadata' ->> 'tenant_id'
-- which is the canonical path set by custom_access_token_hook (022).
-- Both wrong-path (root-level) and correct-path (app_metadata) are normalized.
--
-- PREDECESSOR: 085_hook_emit_tenant_id_both_levels.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;

GRANT EXECUTE ON FUNCTION public.jwt_tenant_id() TO authenticated;

COMMENT ON FUNCTION public.jwt_tenant_id() IS
  'Returns tenant_id from JWT app_metadata. Single source of truth for RLS policies.';

-- REWRITE: announcement.ann_admin_all [*]
DROP POLICY IF EXISTS ann_admin_all ON public.announcement;
CREATE POLICY ann_admin_all ON public.announcement TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: announcement.ann_self_read [r]
DROP POLICY IF EXISTS ann_self_read ON public.announcement;
CREATE POLICY ann_self_read ON public.announcement FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (publish_at <= now()) AND ((expires_at IS NULL) OR (expires_at > now())) AND ((audience_roles = '{}'::text[]) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = ANY (announcement.audience_roles)))))));

-- REWRITE: book.book_admin_all [*]
DROP POLICY IF EXISTS book_admin_all ON public.book;
CREATE POLICY book_admin_all ON public.book TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: book.book_read [r]
DROP POLICY IF EXISTS book_read ON public.book;
CREATE POLICY book_read ON public.book FOR SELECT TO authenticated USING (tenant_id = ((public.jwt_tenant_id()))::uuid);

-- REWRITE: booklist.bl_admin_all [*]
DROP POLICY IF EXISTS bl_admin_all ON public.booklist;
CREATE POLICY bl_admin_all ON public.booklist TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: booklist.bl_family_read [r]
DROP POLICY IF EXISTS bl_family_read ON public.booklist;
CREATE POLICY bl_family_read ON public.booklist FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM family_child fc WHERE ((fc.guardian_id = auth.uid()) AND (fc.child_id = booklist.child_id)))));

-- REWRITE: booklist.bl_self_read [r]
DROP POLICY IF EXISTS bl_self_read ON public.booklist;
CREATE POLICY bl_self_read ON public.booklist FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (child_id = auth.uid()));

-- REWRITE: booklist.bl_teacher_read [r]
DROP POLICY IF EXISTS bl_teacher_read ON public.booklist;
CREATE POLICY bl_teacher_read ON public.booklist FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM (student_class sc JOIN courses c ON ((c.id = sc.class_id))) WHERE ((sc.student_id = booklist.child_id) AND (c.teacher_id = auth.uid())))));

-- REWRITE: booklist_item.bi_admin_all [*]
DROP POLICY IF EXISTS bi_admin_all ON public.booklist_item;
CREATE POLICY bi_admin_all ON public.booklist_item TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: booklist_item.bi_family_read [r]
DROP POLICY IF EXISTS bi_family_read ON public.booklist_item;
CREATE POLICY bi_family_read ON public.booklist_item FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM (booklist bl JOIN family_child fc ON ((fc.child_id = bl.child_id))) WHERE ((bl.id = booklist_item.booklist_id) AND (fc.guardian_id = auth.uid())))));

-- REWRITE: booklist_item.bi_self_read [r]
DROP POLICY IF EXISTS bi_self_read ON public.booklist_item;
CREATE POLICY bi_self_read ON public.booklist_item FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM booklist bl WHERE ((bl.id = booklist_item.booklist_id) AND (bl.child_id = auth.uid())))));

-- REWRITE: booklist_item.bi_teacher_read [r]
DROP POLICY IF EXISTS bi_teacher_read ON public.booklist_item;
CREATE POLICY bi_teacher_read ON public.booklist_item FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM ((booklist bl JOIN student_class sc ON ((sc.student_id = bl.child_id))) JOIN courses c ON ((c.id = sc.class_id))) WHERE ((bl.id = booklist_item.booklist_id) AND (c.teacher_id = auth.uid())))));

-- REWRITE: certificates.cert_family_select [r]
DROP POLICY IF EXISTS cert_family_select ON public.certificates;
CREATE POLICY cert_family_select ON public.certificates FOR SELECT TO authenticated USING ((status = 'issued'::text) AND (tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'family'::text)))) AND (EXISTS ( SELECT 1 FROM family_child fc WHERE ((fc.guardian_id = auth.uid()) AND (fc.child_id = certificates.user_id)))));

-- REWRITE: consent_records.consent_admin_all [*]
DROP POLICY IF EXISTS consent_admin_all ON public.consent_records;
CREATE POLICY consent_admin_all ON public.consent_records TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: conversations.conversations_member_write [*]
DROP POLICY IF EXISTS conversations_member_write ON public.conversations;
CREATE POLICY conversations_member_write ON public.conversations TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM conversation_members cm WHERE ((cm.conversation_id = conversations.id) AND (cm.profile_id = auth.uid()))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM conversation_members cm WHERE ((cm.conversation_id = conversations.id) AND (cm.profile_id = auth.uid())))));

-- REWRITE: conversations.conversations_tenant_read [r]
DROP POLICY IF EXISTS conversations_tenant_read ON public.conversations;
CREATE POLICY conversations_tenant_read ON public.conversations FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND ((EXISTS ( SELECT 1 FROM conversation_members cm WHERE ((cm.conversation_id = conversations.id) AND (cm.profile_id = auth.uid())))) OR (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.tenant_id = ((public.jwt_tenant_id()))::uuid) AND (p.role = 'admin'::text))))));

-- SAME: devotional_config.admin_all_devotional_config [*]
DROP POLICY IF EXISTS admin_all_devotional_config ON public.devotional_config;
CREATE POLICY admin_all_devotional_config ON public.devotional_config TO authenticated USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- SAME: devotional_item.admin_all_devotional_item [*]
DROP POLICY IF EXISTS admin_all_devotional_item ON public.devotional_item;
CREATE POLICY admin_all_devotional_item ON public.devotional_item TO authenticated USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- REWRITE: enrichment_meta.em_admin_all [*]
DROP POLICY IF EXISTS em_admin_all ON public.enrichment_meta;
CREATE POLICY em_admin_all ON public.enrichment_meta TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: enrichment_meta.em_self_read [r]
DROP POLICY IF EXISTS em_self_read ON public.enrichment_meta;
CREATE POLICY em_self_read ON public.enrichment_meta FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM student_class sc WHERE ((sc.id = enrichment_meta.student_class_id) AND (sc.student_id = auth.uid())))));

-- REWRITE: enrichment_meta.em_teacher_read [r]
DROP POLICY IF EXISTS em_teacher_read ON public.enrichment_meta;
CREATE POLICY em_teacher_read ON public.enrichment_meta FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM (student_class sc JOIN courses c ON ((c.id = sc.class_id))) WHERE ((sc.id = enrichment_meta.student_class_id) AND (c.teacher_id = auth.uid())))));

-- REWRITE: enrichment_meta.em_teacher_write [a]
DROP POLICY IF EXISTS em_teacher_write ON public.enrichment_meta;
CREATE POLICY em_teacher_write ON public.enrichment_meta FOR INSERT TO authenticated WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM (student_class sc JOIN courses c ON ((c.id = sc.class_id))) WHERE ((sc.id = enrichment_meta.student_class_id) AND (c.teacher_id = auth.uid())))));

-- REWRITE: enrichment_meta.em_teacher_write_update [w]
DROP POLICY IF EXISTS em_teacher_write_update ON public.enrichment_meta;
CREATE POLICY em_teacher_write_update ON public.enrichment_meta FOR UPDATE TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM (student_class sc JOIN courses c ON ((c.id = sc.class_id))) WHERE ((sc.id = enrichment_meta.student_class_id) AND (c.teacher_id = auth.uid()))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM (student_class sc JOIN courses c ON ((c.id = sc.class_id))) WHERE ((sc.id = enrichment_meta.student_class_id) AND (c.teacher_id = auth.uid())))));

-- REWRITE: family_child.fc_admin_all [*]
DROP POLICY IF EXISTS fc_admin_all ON public.family_child;
CREATE POLICY fc_admin_all ON public.family_child TO authenticated USING (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.tenant_id = ((public.jwt_tenant_id()))::uuid)))) WITH CHECK (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.tenant_id = ((public.jwt_tenant_id()))::uuid))));

-- REWRITE: handle_changes.handle_changes_master_admin_select [r]
DROP POLICY IF EXISTS handle_changes_master_admin_select ON public.handle_changes;
CREATE POLICY handle_changes_master_admin_select ON public.handle_changes FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: message_reactions.reactions_self_write [*]
DROP POLICY IF EXISTS reactions_self_write ON public.message_reactions;
CREATE POLICY reactions_self_write ON public.message_reactions TO authenticated USING ((EXISTS ( SELECT 1 FROM (messages m JOIN conversations c ON ((c.id = m.conversation_id))) WHERE ((m.id = message_reactions.message_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid)))) AND (profile_id = auth.uid())) WITH CHECK ((EXISTS ( SELECT 1 FROM (messages m JOIN conversations c ON ((c.id = m.conversation_id))) WHERE ((m.id = message_reactions.message_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid)))) AND (profile_id = auth.uid()));

-- REWRITE: message_reactions.reactions_tenant_read [r]
DROP POLICY IF EXISTS reactions_tenant_read ON public.message_reactions;
CREATE POLICY reactions_tenant_read ON public.message_reactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM (messages m JOIN conversations c ON ((c.id = m.conversation_id))) WHERE ((m.id = message_reactions.message_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid)))) AND (EXISTS ( SELECT 1 FROM (messages m JOIN conversation_members cm ON ((cm.conversation_id = m.conversation_id))) WHERE ((m.id = message_reactions.message_id) AND (cm.profile_id = auth.uid())))));

-- REWRITE: messages.messages_member_write [a]
DROP POLICY IF EXISTS messages_member_write ON public.messages;
CREATE POLICY messages_member_write ON public.messages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid)))) AND (sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM conversation_members cm WHERE ((cm.conversation_id = messages.conversation_id) AND (cm.profile_id = auth.uid())))));

-- REWRITE: messages.messages_sender_update [w]
DROP POLICY IF EXISTS messages_sender_update ON public.messages;
CREATE POLICY messages_sender_update ON public.messages FOR UPDATE TO authenticated USING ((sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid))))) WITH CHECK ((sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid)))));

-- REWRITE: messages.messages_tenant_read [r]
DROP POLICY IF EXISTS messages_tenant_read ON public.messages;
CREATE POLICY messages_tenant_read ON public.messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND (c.tenant_id = ((public.jwt_tenant_id()))::uuid)))) AND (EXISTS ( SELECT 1 FROM conversation_members cm WHERE ((cm.conversation_id = messages.conversation_id) AND (cm.profile_id = auth.uid())))));

-- SAME: platform_access.pa_self_read [r]
DROP POLICY IF EXISTS pa_self_read ON public.platform_access;
CREATE POLICY pa_self_read ON public.platform_access FOR SELECT TO authenticated USING ((user_id = ((auth.jwt() ->> 'sub'::text))::uuid) AND (tenant_id = ( SELECT p.tenant_id FROM profiles p WHERE (p.id = ((auth.jwt() ->> 'sub'::text))::uuid))));

-- REWRITE: profiles.admin_select_tenant_profiles [r]
DROP POLICY IF EXISTS admin_select_tenant_profiles ON public.profiles;
CREATE POLICY admin_select_tenant_profiles ON public.profiles FOR SELECT TO authenticated USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text) AND (tenant_id = ((public.jwt_tenant_id()))::uuid));

-- REWRITE: report_cards.rc_admin_all [*]
DROP POLICY IF EXISTS rc_admin_all ON public.report_cards;
CREATE POLICY rc_admin_all ON public.report_cards TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: report_cards.rc_family_select [r]
DROP POLICY IF EXISTS rc_family_select ON public.report_cards;
CREATE POLICY rc_family_select ON public.report_cards FOR SELECT TO authenticated USING ((status = 'visible'::text) AND (tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'family'::text)))) AND (EXISTS ( SELECT 1 FROM family_child fc WHERE ((fc.guardian_id = auth.uid()) AND (fc.child_id = report_cards.student_id)))));

-- REWRITE: report_cards.rc_office_manage [w]
DROP POLICY IF EXISTS rc_office_manage ON public.report_cards;
CREATE POLICY rc_office_manage ON public.report_cards FOR UPDATE TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'office'::text))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'office'::text)))) AND (((status = 'released'::text) AND (released_by = auth.uid()) AND (released_at IS NOT NULL)) OR ((status = 'visible'::text) AND (visible_at IS NOT NULL))));

-- REWRITE: report_cards.rc_office_select [r]
DROP POLICY IF EXISTS rc_office_select ON public.report_cards;
CREATE POLICY rc_office_select ON public.report_cards FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'office'::text)))));

-- REWRITE: schedule_slot.ss_admin_read [r]
DROP POLICY IF EXISTS ss_admin_read ON public.schedule_slot;
CREATE POLICY ss_admin_read ON public.schedule_slot FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: schedule_slot.ss_admin_write [*]
DROP POLICY IF EXISTS ss_admin_write ON public.schedule_slot;
CREATE POLICY ss_admin_write ON public.schedule_slot TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: schedule_slot.ss_student_read [r]
DROP POLICY IF EXISTS ss_student_read ON public.schedule_slot;
CREATE POLICY ss_student_read ON public.schedule_slot FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND has_item_access(course_id) AND (EXISTS ( SELECT 1 FROM student_class sc WHERE ((sc.student_id = auth.uid()) AND (sc.class_id = schedule_slot.course_id) AND sc.is_active))));

-- REWRITE: schedule_slot.ss_teacher_read [r]
DROP POLICY IF EXISTS ss_teacher_read ON public.schedule_slot;
CREATE POLICY ss_teacher_read ON public.schedule_slot FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM courses c WHERE ((c.id = schedule_slot.course_id) AND (c.teacher_id = auth.uid())))));

-- REWRITE: suppression_records.suppression_admin_all [*]
DROP POLICY IF EXISTS suppression_admin_all ON public.suppression_records;
CREATE POLICY suppression_admin_all ON public.suppression_records TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- SAME: tenant_devotional.admin_all_tenant_devotional [*]
DROP POLICY IF EXISTS admin_all_tenant_devotional ON public.tenant_devotional;
CREATE POLICY admin_all_tenant_devotional ON public.tenant_devotional TO authenticated USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- SAME: tenant_lms.admin_all_tenant_lms [*]
DROP POLICY IF EXISTS admin_all_tenant_lms ON public.tenant_lms;
CREATE POLICY admin_all_tenant_lms ON public.tenant_lms TO authenticated USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- SAME: tenant_mobile.admin_all_tenant_mobile [*]
DROP POLICY IF EXISTS admin_all_tenant_mobile ON public.tenant_mobile;
CREATE POLICY admin_all_tenant_mobile ON public.tenant_mobile TO authenticated USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

-- REWRITE: terms.terms_admin_read [r]
DROP POLICY IF EXISTS terms_admin_read ON public.terms;
CREATE POLICY terms_admin_read ON public.terms FOR SELECT TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: terms.terms_admin_write [*]
DROP POLICY IF EXISTS terms_admin_write ON public.terms;
CREATE POLICY terms_admin_write ON public.terms TO authenticated USING ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((tenant_id = ((public.jwt_tenant_id()))::uuid) AND (EXISTS ( SELECT 1 FROM profiles p WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

-- REWRITE: terms.terms_member_read [r]
DROP POLICY IF EXISTS terms_member_read ON public.terms;
CREATE POLICY terms_member_read ON public.terms FOR SELECT TO authenticated USING (is_active AND (tenant_id = ((public.jwt_tenant_id()))::uuid));

COMMIT;
