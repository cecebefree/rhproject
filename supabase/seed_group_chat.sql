-- Run this in Supabase SQL Editor to seed group chat data
-- Tenant: Redhouse (00000000-0000-0000-0000-000000000001)

DO $$
DECLARE
  v_tenant UUID := '00000000-0000-0000-0000-000000000001';
  v_user UUID;
  v_group1 UUID;
  v_group2 UUID;
  v_group3 UUID;
BEGIN
  SELECT id INTO v_user FROM public.profiles WHERE tenant_id = v_tenant LIMIT 1;

  -- Clear old data if re-running
  DELETE FROM public.group_messages WHERE group_id IN (SELECT id FROM public.group_conversations WHERE tenant_id = v_tenant);
  DELETE FROM public.group_conversations WHERE tenant_id = v_tenant;

  INSERT INTO public.group_conversations (tenant_id, name, category, lead, description, member_count)
  VALUES (v_tenant, 'Junior Science', 'club', 'Mrs. Ndaba', 'Hands-on experiments and science exploration for junior school students.', 12)
  RETURNING id INTO v_group1;

  INSERT INTO public.group_conversations (tenant_id, name, category, lead, description, member_count)
  VALUES (v_tenant, 'Senior Entrepreneurs', 'club', 'Mr. van der Merwe', 'Building real business ideas. Pitch competitions and mentorship.', 8)
  RETURNING id INTO v_group2;

  INSERT INTO public.group_conversations (tenant_id, name, category, lead, description, member_count)
  VALUES (v_tenant, 'Grade 8A', 'class', 'Ms. Potgieter', 'Grade 8 class group — announcements, homework, and class discussions.', 25)
  RETURNING id INTO v_group3;

  IF v_user IS NOT NULL THEN
    INSERT INTO public.group_messages (group_id, sender_id, sender_name, sender_handle, content, created_at)
    VALUES
      (v_group1, v_user, 'Cece', 'cece@redhouse.co.za', 'Welcome to Junior Science! Our first experiment is next Tuesday.', now() - interval '2 hours'),
      (v_group1, v_user, 'Cece', 'cece@redhouse.co.za', 'Please bring your lab coats and safety goggles.', now() - interval '1 hour'),
      (v_group1, v_user, 'Cece', 'cece@redhouse.co.za', 'Reminder: Volcano experiment results due Friday.', now() - interval '30 minutes'),
      (v_group2, v_user, 'Cece', 'cece@redhouse.co.za', 'Senior Entrepreneurs — pitch day is in 3 weeks!', now() - interval '3 hours'),
      (v_group2, v_user, 'Cece', 'cece@redhouse.co.za', 'Submit your business proposals by end of this week.', now() - interval '1 hour'),
      (v_group3, v_user, 'Cece', 'cece@redhouse.co.za', 'Grade 8A — maths homework due tomorrow.', now() - interval '5 hours'),
      (v_group3, v_user, 'Cece', 'cece@redhouse.co.za', 'Parent-teacher meetings are next Thursday.', now() - interval '2 hours'),
      (v_group3, v_user, 'Cece', 'cece@redhouse.co.za', 'Well done everyone on the term project!', now() - interval '45 minutes');
  END IF;
END $$;
