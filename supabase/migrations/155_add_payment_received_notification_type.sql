-- Migration 155: Add 'payment_received' to notifications type CHECK constraint
-- The webhook handler creates notifications with type='payment_received' but the
-- CHECK constraint did not include it, causing silent insert failures in tests.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (
      ARRAY[
        'announcement'::text,
        'enrolment'::text,
        'schedule'::text,
        'system'::text,
        'mention'::text,
        'registration_approved'::text,
        'grade_posted'::text,
        'attendance_logged'::text,
        'message_received'::text,
        'payment_received'::text
      ]
    )
  );
