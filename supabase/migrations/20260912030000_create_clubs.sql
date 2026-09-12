-- Migration: Create clubs table for junior/senior enrichment clubs
-- Used by: scheduleClient.ts (OTT scheduled events), hub screen
-- Clubs are tenant-scoped, categorized by stage (junior/senior/general)

CREATE TABLE IF NOT EXISTS public.clubs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.profiles(tenant_id),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'general',   -- junior | senior | general
  schedule    JSONB,                              -- { day: 'monday', time: '14:00', duration: 60 }
  status      TEXT NOT NULL DEFAULT 'active',     -- active | archived
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY clubs_admin_all ON public.clubs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.tenant_id = clubs.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.tenant_id = clubs.tenant_id
    )
  );

-- Teacher: read clubs in their tenant
CREATE POLICY clubs_teacher_read ON public.clubs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.tenant_id = clubs.tenant_id
    )
  );

-- Student: read active clubs in their tenant
CREATE POLICY clubs_student_read ON public.clubs
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'student'
        AND p.tenant_id = clubs.tenant_id
    )
  );

-- Adult/parent: read active clubs in their tenant
CREATE POLICY clubs_adult_read ON public.clubs
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'adult'
        AND p.tenant_id = clubs.tenant_id
    )
  );

CREATE TRIGGER trg_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
