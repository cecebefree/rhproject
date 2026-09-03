-- RLS policies for public.chapters
-- Students and teachers access via RPC only, not direct SELECT

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Admin can read all chapters
CREATE POLICY admin_select_chapters ON public.chapters
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Deny direct SELECT for non-admin (force RPC)
CREATE POLICY deny_select_chapters ON public.chapters
FOR SELECT
TO authenticated
USING (FALSE);

-- Deny INSERT, UPDATE, DELETE for all authenticated
CREATE POLICY deny_insert_chapters ON public.chapters
FOR INSERT
TO authenticated
WITH CHECK (FALSE);

CREATE POLICY deny_update_chapters ON public.chapters
FOR UPDATE
TO authenticated
USING (FALSE);

CREATE POLICY deny_delete_chapters ON public.chapters
FOR DELETE
TO authenticated
USING (FALSE);
