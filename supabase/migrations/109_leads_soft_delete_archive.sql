-- Migration 109: Soft-delete (archive) workflow for front_desk.leads
-- Adds archived_at + archive_reason columns, archive audit table,
-- and updates all 6 RLS policies to exclude archived leads by default.
--
-- Design:
--   - Archived leads hidden from normal queries (WHERE archived_at IS NULL)
--   - Admin + front_desk can query archived leads via explicit filter
--   - Only admin + front_desk can archive/un-archive
--   - Office desk CANNOT see archived leads (handoff reference only)
--   - Audit table logs who archived/un-archived and why (compliance)
--
-- PREDECESSOR: 108

BEGIN;

-- ============================================================
-- 1. ENUM: archive reason
-- ============================================================
CREATE TYPE front_desk.archive_reason_type AS ENUM (
  'enrolled',     -- lead converted to student
  'withdrawn',    -- lead withdrew interest
  'inactive',     -- no response after follow-up window
  'duplicate',    -- duplicate of another lead
  'other'         -- catch-all (notes required)
);

-- ============================================================
-- 2. COLUMNS on front_desk.leads
-- ============================================================
ALTER TABLE front_desk.leads
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archive_reason front_desk.archive_reason_type;

COMMENT ON COLUMN front_desk.leads.archived_at IS 'Timestamp when lead was archived. NULL = active.';
COMMENT ON COLUMN front_desk.leads.archive_reason IS 'Reason for archiving. NULL = not archived.';

-- Partial index: fast lookup of active leads (excludes archived)
CREATE INDEX idx_leads_active ON front_desk.leads (tenant_id, created_at)
  WHERE archived_at IS NULL;

-- ============================================================
-- 3. AUDIT TABLE: lead archive events
-- ============================================================
CREATE TABLE front_desk.lead_archive_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES front_desk.leads(id),
  tenant_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('archive', 'unarchive')),
  reason      front_desk.archive_reason_type,
  notes       text,
  actor_id    uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE front_desk.lead_archive_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE front_desk.lead_archive_log IS 'Immutable audit log of lead archive/un-archive events. Append-only.';

-- Admin: full read within tenant
CREATE POLICY archive_log_admin_select ON front_desk.lead_archive_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Front desk: read within tenant
CREATE POLICY archive_log_front_desk_select ON front_desk.lead_archive_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'front_desk'
    )
  );

-- Grants: append-only (INSERT via trigger function, no direct UPDATE/DELETE)
GRANT INSERT ON front_desk.lead_archive_log TO authenticated;
GRANT SELECT ON front_desk.lead_archive_log TO authenticated;

-- ============================================================
-- 4. ARCHIVE/UN-ARCHIVE FUNCTION (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.archive_lead(
  p_lead_id   uuid,
  p_action    text,           -- 'archive' or 'unarchive'
  p_reason    front_desk.archive_reason_type DEFAULT NULL,
  p_notes     text DEFAULT NULL
)
RETURNS front_desk.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lead     front_desk.leads;
  v_caller   profiles%ROWTYPE;
  v_reason   front_desk.archive_reason_type;
BEGIN
  -- Resolve caller
  SELECT * INTO v_caller
    FROM profiles
   WHERE id = auth.uid();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'archive_lead: caller profile not found';
  END IF;

  IF v_caller.role NOT IN ('admin', 'front_desk') THEN
    RAISE EXCEPTION 'archive_lead: role % not authorized', v_caller.role;
  END IF;

  IF v_caller.tenant_id IS NULL THEN
    RAISE EXCEPTION 'archive_lead: D-15 caller tenant_id is NULL';
  END IF;

  -- Fetch lead (service_role bypasses RLS, server-side tenant filter)
  SELECT * INTO v_lead
    FROM front_desk.leads
   WHERE id = p_lead_id
     AND tenant_id = v_caller.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'archive_lead: lead % not found or cross-tenant', p_lead_id;
  END IF;

  -- Validate action
  IF p_action NOT IN ('archive', 'unarchive') THEN
    RAISE EXCEPTION 'archive_lead: invalid action %', p_action;
  END IF;

  -- Validate state transition
  IF p_action = 'archive' AND v_lead.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'archive_lead: lead % is already archived', p_lead_id;
  END IF;

  IF p_action = 'unarchive' AND v_lead.archived_at IS NULL THEN
    RAISE EXCEPTION 'archive_lead: lead % is not archived', p_lead_id;
  END IF;

  -- Require reason on archive (not on unarchive)
  IF p_action = 'archive' AND p_reason IS NULL THEN
    RAISE EXCEPTION 'archive_lead: reason required for archiving';
  END IF;

  -- Apply action
  IF p_action = 'archive' THEN
    UPDATE front_desk.leads
       SET archived_at = now(),
           archive_reason = p_reason
     WHERE id = p_lead_id
     RETURNING * INTO v_lead;
  ELSE
    UPDATE front_desk.leads
       SET archived_at = NULL,
           archive_reason = NULL
     WHERE id = p_lead_id
     RETURNING * INTO v_lead;
  END IF;

  -- Audit log (immutable, append-only)
  INSERT INTO front_desk.lead_archive_log
    (lead_id, tenant_id, action, reason, notes, actor_id)
  VALUES
    (p_lead_id, v_caller.tenant_id, p_action, p_reason, p_notes, auth.uid());

  RETURN v_lead;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.archive_lead(uuid, text, front_desk.archive_reason_type, text) TO authenticated;

-- ============================================================
-- 5. UPDATE RLS POLICIES: exclude archived leads by default
-- ============================================================

-- 1. ADMIN ALL — add archived_at IS NULL filter on SELECT
DROP POLICY IF EXISTS leads_admin_all ON front_desk.leads;
CREATE POLICY leads_admin_all ON front_desk.leads
    FOR ALL TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
        AND archived_at IS NULL
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 2. FRONT DESK SELECT — exclude archived
DROP POLICY IF EXISTS leads_front_desk_select ON front_desk.leads;
CREATE POLICY leads_front_desk_select ON front_desk.leads
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
        AND archived_at IS NULL
    );

-- 3. FRONT DESK INSERT — unchanged (archived_at defaults to NULL)
DROP POLICY IF EXISTS leads_front_desk_insert ON front_desk.leads;
CREATE POLICY leads_front_desk_insert ON front_desk.leads
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
    );

-- 4. FRONT DESK UPDATE — exclude archived (cannot edit archived leads via direct UPDATE)
DROP POLICY IF EXISTS leads_front_desk_update ON front_desk.leads;
CREATE POLICY leads_front_desk_update ON front_desk.leads
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
        AND archived_at IS NULL
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'front_desk'
        )
        AND status IN ('enquiry', 'qualified', 'invoiced', 'handed_off')
    );

-- 5. OFFICE DESK SELECT — exclude archived (office only sees active leads for handoff)
DROP POLICY IF EXISTS leads_office_select ON front_desk.leads;
CREATE POLICY leads_office_select ON front_desk.leads
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND archived_at IS NULL
    );

-- 6. OFFICE DESK UPDATE — exclude archived
DROP POLICY IF EXISTS leads_office_handoff ON front_desk.leads;
CREATE POLICY leads_office_handoff ON front_desk.leads
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND status IN ('invoiced', 'qualified')
        AND archived_at IS NULL
    )
    WITH CHECK (
        tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'office'
        )
        AND status = 'handed_off'
    );

COMMIT;
