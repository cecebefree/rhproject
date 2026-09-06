-- pending_payment_reminder.sql
-- Row 85: Find registrations stuck in pending_review for >24 hours,
-- create reminder notifications, log to Office Desk.
-- Invoke via: SELECT pending_payment_reminder();

CREATE OR REPLACE FUNCTION public.pending_payment_reminder()
RETURNS TABLE(registration_id uuid, student_name text, reminder_sent boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  reminder_count integer := 0;
BEGIN
  -- Find registrations stuck in pending_review for more than 24 hours
  FOR rec IN
    SELECT r.id, r.student_name, r.student_email, r.created_at
    FROM office_desk.registrations r
    WHERE r.status = 'pending_review'
      AND r.created_at < now() - interval '24 hours'
      -- Don't remind if we already sent a reminder in the last 24 hours
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.registration_id = r.id
          AND n.notification_type = 'payment_reminder'
          AND n.created_at > now() - interval '24 hours'
      )
  LOOP
    -- Create notification
    INSERT INTO public.notifications (
      registration_id,
      notification_type,
      title,
      body,
      status,
      tenant_id,
      email_to,
      data,
      created_at
    ) VALUES (
      rec.id,
      'payment_reminder',
      'Payment Pending: ' || rec.student_name,
      'Registration for ' || rec.student_name || ' (' || rec.student_email || ') has been pending payment for over 24 hours. Created: ' || to_char(rec.created_at, 'YYYY-MM-DD HH24:MI'),
      'pending',
      '00000000-0000-0000-0000-000000000001',
      rec.student_email,
      jsonb_build_object(
        'student_name', rec.student_name,
        'registration_created', rec.created_at,
        'hours_waiting', extract(epoch from (now() - rec.created_at)) / 3600
      ),
      now()
    );

    reminder_count := reminder_count + 1;

    registration_id := rec.id;
    student_name := rec.student_name;
    reminder_sent := true;
    RETURN NEXT;
  END LOOP;

  -- If no reminders sent, return empty
  IF reminder_count = 0 THEN
    RAISE NOTICE 'No registrations pending payment for >24 hours';
  END IF;
END;
$$;
