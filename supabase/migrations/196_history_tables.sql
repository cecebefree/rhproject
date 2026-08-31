-- 196_history_tables.sql
-- GDPR-compliant history tables: audit_log triggers on student_class + student_history
--
-- 1. Trigger on student_class INSERT/UPDATE/DELETE → audit_log
-- 2. student_history table: soft-delete snapshot with 7-year retention
-- 3. Trigger on student UPDATE → student_history (when deleted_at is set)

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. AUDIT LOG TRIGGER — student_class
--    Logs every INSERT, UPDATE, DELETE to public.audit_log
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_audit_student_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, operation, new_values, user_id)
    VALUES ('student_class', 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
    VALUES ('student_class', 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, operation, old_values, user_id)
    VALUES ('student_class', 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_student_class ON public.student_class;
CREATE TRIGGER trg_audit_student_class
  AFTER INSERT OR UPDATE OR DELETE ON public.student_class
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_student_class();

-- ═══════════════════════════════════════════════════════════
-- 2. STUDENT HISTORY TABLE
--    GDPR: soft-delete snapshots with 7-year retention
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.student_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES auth.users(id),
  snapshot      jsonb NOT NULL,
  operation     text NOT NULL CHECK (operation IN ('SOFT_DELETE', 'UPDATE', 'RESTORE')),
  deleted_at    timestamptz,
  retention_expires timestamptz NOT NULL DEFAULT (now() + interval '7 years'),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_history IS 'GDPR retention: student snapshots for 7 years after soft-delete';
COMMENT ON COLUMN public.student_history.snapshot IS 'JSONB snapshot of the student row at time of operation';
COMMENT ON COLUMN public.student_history.retention_expires IS 'Auto-purge after 7 years (GDPR Article 17)';

ALTER TABLE public.student_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read student_history
DROP POLICY IF EXISTS sh_admin_read ON public.student_history;
CREATE POLICY sh_admin_read ON public.student_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Service role can insert (triggers run as security definer)
GRANT ALL ON public.student_history TO service_role;
GRANT SELECT ON public.student_history TO authenticated;

CREATE INDEX IF NOT EXISTS idx_student_history_student_id ON public.student_history (student_id);
CREATE INDEX IF NOT EXISTS idx_student_history_retention ON public.student_history (retention_expires);

-- ═══════════════════════════════════════════════════════════
-- 3. STUDENT HISTORY TRIGGER
--    Fires on public.students UPDATE when deleted_at is set
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_student_history_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire on soft-delete (deleted_at transition from NULL to non-NULL)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.student_history (student_id, snapshot, operation, deleted_at)
    VALUES (NEW.id, to_jsonb(NEW), 'SOFT_DELETE', NEW.deleted_at);
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    -- Restore from soft-delete
    INSERT INTO public.student_history (student_id, snapshot, operation)
    VALUES (NEW.id, to_jsonb(NEW), 'RESTORE');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_history ON public.students;
CREATE TRIGGER trg_student_history
  AFTER UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.fn_student_history_trigger();

-- ═══════════════════════════════════════════════════════════
-- 4. RETENTION CLEANUP FUNCTION
--    Purges student_history rows past retention_expires
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_cleanup_student_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.student_history
  WHERE retention_expires < now();
END;
$$;

COMMENT ON FUNCTION public.fn_cleanup_student_history() IS 'Purge GDPR retention-expired student history rows';

COMMIT;
