DROP POLICY IF EXISTS rc_learner_select_visible ON public.report_cards;

CREATE POLICY rc_learner_select_visible ON public.report_cards
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    AND status = 'visible'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('learner', 'student')
    )
  );
