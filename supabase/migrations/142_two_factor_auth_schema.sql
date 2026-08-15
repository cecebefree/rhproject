-- Migration 142: Two-Factor Authentication (2FA)
-- Creates user_2fa table with encrypted secrets and backup codes

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════
-- USER 2FA TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_2fa_user_id_unique UNIQUE (user_id)
);

-- Indexes
CREATE INDEX idx_user_2fa_user_id ON public.user_2fa(user_id);
CREATE INDEX idx_user_2fa_tenant_id ON public.user_2fa(tenant_id);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_user_2fa_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_2fa_updated_at
  BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_2fa_timestamp();

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

-- User can view their own 2FA config
CREATE POLICY user_2fa_select_own ON public.user_2fa
  FOR SELECT
  USING (auth.uid() = user_id);

-- User can update their own 2FA config
CREATE POLICY user_2fa_update_own ON public.user_2fa
  FOR UPDATE
  USING (auth.uid() = user_id);

-- User can delete their own 2FA config
CREATE POLICY user_2fa_delete_own ON public.user_2fa
  FOR DELETE
  USING (auth.uid() = user_id);

-- User can insert their own 2FA config
CREATE POLICY user_2fa_insert_own ON public.user_2fa
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all 2FA configs (for backend operations)
CREATE POLICY user_2fa_service_role ON public.user_2fa
  FOR ALL
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════

-- Grant table access
GRANT ALL ON public.user_2fa TO authenticated;
GRANT ALL ON public.user_2fa TO service_role;

-- Grant sequence access
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
