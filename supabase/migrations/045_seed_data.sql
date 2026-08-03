-- 045_seed_data.sql (ITEM 13)
-- Schema-only: role expansion + tenant seed.
-- Auth users, profiles, consent, report_cards, certificates → seed.sql (Admin API).
-- PREDECESSOR: 044_rls_for_042_043.sql
BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
        'student', 'outside_student', 'family', 'alumni',
        'teacher', 'expert', 'guest', 'admin',
        'learner', 'office'
    ));

INSERT INTO public.tenant_mobile (id, name, slug, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_devotional (id, name, slug, is_active, created_at)
VALUES ('e97e5c3a-1234-4321-abcd-000000000001', 'Redhouse Prep', 'demo', true, now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
