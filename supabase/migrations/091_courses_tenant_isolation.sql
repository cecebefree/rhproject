-- 091_courses_tenant_isolation.sql
-- Finding 41a-3: courses table has no tenant_id scoping on SELECT
-- Adds tenant_id column, backfills via teacher→profiles join,
-- rewrites all RLS policies with tenant_id checks.
--
-- PREDECESSOR: 090_grant_service_role_rc_update.sql

BEGIN;

-- ============================================================
-- PART 1: Schema
-- ============================================================
ALTER TABLE courses ADD COLUMN tenant_id uuid REFERENCES tenant_lms(id);

-- ============================================================
-- PART 2: Backfill
-- ============================================================
-- Backfill courses where teacher_id maps to a known tenant
UPDATE courses c
SET tenant_id = p.tenant_id
FROM profiles p
WHERE c.teacher_id = p.id
  AND p.tenant_id IS NOT NULL
  AND c.tenant_id IS NULL;

-- Seed Mathematics / Seed Science (...5551, ...5552) remain NULL
-- Fail-closed by design per Decision 1 — admin bypass at policy layer.

-- ============================================================
-- PART 3: RLS policies
-- ============================================================

-- Drop existing policies (all four)
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "courses_no_core_outside" ON public.courses;

-- 1) Admin: tenant-scoped + can see NULL-tenant courses (Decision 1 bypass)
CREATE POLICY courses_admin_all ON public.courses
    FOR ALL TO authenticated
    USING (
        (tenant_id = public.jwt_tenant_id() OR tenant_id IS NULL)
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        (tenant_id = public.jwt_tenant_id() OR tenant_id IS NULL)
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 2) Published courses: tenant-scoped, authenticated only
CREATE POLICY courses_published_read ON public.courses
    FOR SELECT TO authenticated
    USING (
        status = 'published'
        AND tenant_id = public.jwt_tenant_id()
    );

-- 3) Teacher: tenant-scoped, own courses only
CREATE POLICY courses_teacher_manage ON public.courses
    FOR ALL TO authenticated
    USING (
        tenant_id = public.jwt_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = ANY (ARRAY['teacher', 'admin'])
            AND p.id = courses.teacher_id
        )
    )
    WITH CHECK (
        tenant_id = public.jwt_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = ANY (ARRAY['teacher', 'admin'])
            AND p.id = courses.teacher_id
        )
    );

-- 4) Outside-student filter (RESTRICTIVE, no tenant change needed)
CREATE POLICY courses_no_core_outside ON public.courses
    AS RESTRICTIVE
    FOR SELECT TO authenticated
    USING (
        (NOT (EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'outside_student'
        )))
        OR (type <> 'core' AND open_to_outside = true)
    );

COMMIT;
