-- D-062-HANDLE: handle system (profiles.handle + handle_changes).
-- Register locked 2026-07-18 per rulings R-1..R-7. No direct UPDATE path:
-- handle set only via Edge Function (set_handle); audit rows recorded
-- by the trigger below under definer context.
-- handle_changes has NO INSERT/UPDATE/DELETE RLS policies by design
-- (R-2): append-only via trigger; reads are self_select +
-- master-admin-per-tenant SELECT only. NO admin_all.

-- 1. profiles.handle column + universal format CHECK + per-tenant unique index.
ALTER TABLE public.profiles ADD COLUMN handle text;

ALTER TABLE public.profiles
  ADD CONSTRAINT handle_format_universal
  CHECK (handle IS NULL OR (char_length(handle) BETWEEN 3 AND 20 AND handle !~ '\s'));

CREATE UNIQUE INDEX profiles_tenant_handle_unique
  ON public.profiles (tenant_id, lower(handle))
  WHERE handle IS NOT NULL;

-- 2. handle_changes audit table.
CREATE TABLE public.handle_changes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  tenant_id  uuid NOT NULL,
  old_handle text NULL,
  new_handle text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS on handle_changes: ENABLE + FORCE, self_select + master-admin-per-tenant.
ALTER TABLE public.handle_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handle_changes FORCE ROW LEVEL SECURITY;

CREATE POLICY handle_changes_self_select ON public.handle_changes
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Master-admin-per-tenant SELECT. Mirrors the admin_all qual pattern from
-- 044_rls_for_042_043.sql (tenant_id scoped to JWT tenant, viewer is admin),
-- applied to handle_changes.tenant_id. No widening of the tenant fence.
CREATE POLICY handle_changes_master_admin_select ON public.handle_changes
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. Audit trigger on profiles: record handle changes into handle_changes.
CREATE OR REPLACE FUNCTION public.audit_profile_handle_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO public
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'audit_profile_handle_change: tenant_id must not be NULL for handle set (profile=%)', NEW.id;
  END IF;

  IF NEW.handle IS NULL THEN
    RAISE EXCEPTION 'audit_profile_handle_change: handle clearing is not permitted (profile=%)', NEW.id;
  END IF;

  INSERT INTO public.handle_changes (profile_id, tenant_id, old_handle, new_handle)
  VALUES (NEW.id, NEW.tenant_id, OLD.handle, NEW.handle);

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_audit_profile_handle_change
  AFTER UPDATE OF handle ON public.profiles
  FOR EACH ROW
  WHEN (OLD.handle IS DISTINCT FROM NEW.handle)
  EXECUTE FUNCTION public.audit_profile_handle_change();

-- 5. Grants: Edge Function runs as authenticated; it updates handle and reads the audit log.
-- No INSERT/UPDATE/DELETE on handle_changes (append-only via trigger, R-2).
GRANT UPDATE (handle) ON public.profiles TO authenticated;
GRANT SELECT ON public.handle_changes TO authenticated;
