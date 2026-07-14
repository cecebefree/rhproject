-- 051_office_report_card_lifecycle.sql
-- Replaces rc_office_release + rc_office_visible with a single
-- rc_office_manage policy (permissive). A BEFORE UPDATE trigger
-- enforces the allowed lifecycle transitions:
--   draft -> released  (release)
--   released -> visible (publish)
-- This prevents office from skipping draft -> visible.
--
-- PREDECESSOR: 050_fix_office_report_card_policies.sql

DROP POLICY IF EXISTS rc_office_release ON public.report_cards;
DROP POLICY IF EXISTS rc_office_visible ON public.report_cards;

CREATE POLICY rc_office_manage ON public.report_cards
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND (
            (status = 'released' AND released_by = auth.uid() AND released_at IS NOT NULL)
            OR
            (status = 'visible' AND visible_at IS NOT NULL)
        )
    );

CREATE OR REPLACE FUNCTION public.guard_report_card_lifecycle()
RETURNS trigger LANGUAGE plpgsql AS $func$
BEGIN
  -- No status change: always allowed (content edit by office/admin)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- draft -> released
  IF OLD.status = 'draft' AND NEW.status = 'released' THEN
    RETURN NEW;
  END IF;

  -- released -> visible
  IF OLD.status = 'released' AND NEW.status = 'visible' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid report card status transition: % -> %', OLD.status, NEW.status;
END;
$func$;

DROP TRIGGER IF EXISTS trg_report_card_lifecycle ON public.report_cards;
CREATE TRIGGER trg_report_card_lifecycle
    BEFORE UPDATE ON public.report_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_report_card_lifecycle();
