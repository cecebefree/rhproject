-- Migration 143: Website leads table for Lovable landing page
-- Creates public.website_leads for lead capture via Turnstile CAPTCHA

-- ═══════════════════════════════════════════════════════════
-- TABLE: website_leads
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.website_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  message TEXT,
  turnstile_token TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  verified BOOLEAN DEFAULT false NOT NULL
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

-- Index on created_at for query performance
CREATE INDEX IF NOT EXISTS idx_website_leads_created_at
  ON public.website_leads (created_at DESC);

-- Index on email for lookup performance
CREATE INDEX IF NOT EXISTS idx_website_leads_email
  ON public.website_leads (email);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (for form submission)
CREATE POLICY "website_leads_insert_public"
  ON public.website_leads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Authenticated users can read all leads
CREATE POLICY "website_leads_select_authenticated"
  ON public.website_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update all leads
CREATE POLICY "website_leads_update_authenticated"
  ON public.website_leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete all leads
CREATE POLICY "website_leads_delete_authenticated"
  ON public.website_leads
  FOR DELETE
  TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER: auto-update updated_at timestamp
-- ═══════════════════════════════════════════════════════════

-- Create updated_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'website_leads'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.website_leads
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_website_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_website_leads_updated_at ON public.website_leads;
CREATE TRIGGER update_website_leads_updated_at
  BEFORE UPDATE ON public.website_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_website_leads_updated_at();

-- ═══════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════

COMMENT ON TABLE public.website_leads IS 'Lead capture from Lovable landing page with Turnstile CAPTCHA verification';
COMMENT ON COLUMN public.website_leads.email IS 'Unique email address from lead form';
COMMENT ON COLUMN public.website_leads.name IS 'Optional name from lead form';
COMMENT ON COLUMN public.website_leads.message IS 'Optional message from lead form';
COMMENT ON COLUMN public.website_leads.turnstile_token IS 'Cloudflare Turnstile token for CAPTCHA verification';
COMMENT ON COLUMN public.website_leads.ip_address IS 'IP address of the submitter';
COMMENT ON COLUMN public.website_leads.verified IS 'Whether Turnstile verification passed';
