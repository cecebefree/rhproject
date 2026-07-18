import type { Database } from '@redhouse/shared';
// T014 — LMS feature Supabase client configuration (fail-loud).
// Typed via @redhouse/shared (P2-001 import law): never a relative/deep path.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'LMS Supabase client init failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must both be set'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export type LmsSupabaseClient = typeof supabase;
