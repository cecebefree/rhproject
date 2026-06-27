import { createClient } from '@supabase/supabase-js';
import type { LMSClient } from '../types/lms';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase: LMSClient = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient(): LMSClient {
  return supabase;
}