BEGIN;

-- Seed draft report card for student (043 inserts with status='draft')
INSERT INTO public.report_cards (student_id, term, subject, grade, status, created_by, released_by, released_at, visible_at, tenant_id)
VALUES ('11111111-0000-0000-0000-000000000003', '2026 Term 1', 'Science', 'B', 'draft', '11111111-0000-0000-0000-000000000002', NULL, NULL, NULL, 'e97e5c3a-1234-4321-abcd-000000000001')
ON CONFLICT DO NOTHING;

-- Seed minimal conversation_members data for teacher smoke test
INSERT INTO public.conversations (id, tenant_id, category, created_by, created_at, updated_at)
VALUES ('e0000000-0000-0000-0000-000000000001', 'e97e5c3a-1234-4321-abcd-000000000001', 'general', '11111111-0000-0000-0000-000000000002', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conversation_members (conversation_id, profile_id, role, joined_at)
VALUES ('e0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'lead', now())
ON CONFLICT (conversation_id, profile_id) DO NOTHING;

COMMIT;
