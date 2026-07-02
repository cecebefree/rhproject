-- Migration 021: profiles.tenant_id FK -> tenant_devotional(id), nullable
-- Handoff ref: .swarm/deferred.md line 67
-- Adds tenant_id to profiles for cross-tenant row isolation.
-- Replaces recursive admin policy with JWT-claim check (no subquery into profiles).

BEGIN;

-- Add nullable tenant_id FK
ALTER TABLE public.profiles
  ADD COLUMN tenant_id uuid REFERENCES public.tenant_devotional(id);

CREATE INDEX idx_profiles_tenant_id ON public.profiles (tenant_id);

-- Drop the recursive admin SELECT policy from 013 (queries profiles FROM profiles)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Replace with JWT-claim admin bypass (no recursion)
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
  );

COMMIT;
