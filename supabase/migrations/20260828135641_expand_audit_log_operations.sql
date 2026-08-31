-- Expand audit_log operation types to include enrollment events
ALTER TABLE public.audit_log
DROP CONSTRAINT audit_log_operation_check;

ALTER TABLE public.audit_log
ADD CONSTRAINT audit_log_operation_check
CHECK (operation = ANY (ARRAY[
  'INSERT'::text,
  'UPDATE'::text,
  'DELETE'::text,
  'ENROLLMENT_CREATED'::text,
  'ENROLLMENT_DELETED'::text,
  'ENROLLMENT_UPDATED'::text
]));
