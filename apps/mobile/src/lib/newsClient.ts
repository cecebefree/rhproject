// newsClient.ts — Fetch published news from school_desk.news
// Table: school_desk.news (teacher-authored, tenant-scoped)
// RLS: admin + teacher + student + parent SELECT (see migration 20260909010000)
// Filtering: content_group ('junior', 'senior', 'general') × user profile stage

import { supabase } from '../services/supabase';

// ─── TYPES ────────────────────────────────────────────────────

/** Single news article from school_desk.news */
export interface NewsArticle {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  content_group: string;
  category: string;
}

/** Result wrapper following codebase convention */
export interface NewsResult {
  articles: NewsArticle[];
  error: string | null;
}

// ─── PUBLIC API ───────────────────────────────────────────────

/**
 * Fetch published, non-deleted news articles for the current tenant.
 *
 * Filters by user's profile stage:
 * - Students/Parents: see 'general' news + news matching their stage
 * - Teachers/Admins: see all news (no stage filter)
 *
 * Returns the most recently published articles first. Only articles
 * with a non-null published_at are included (no drafts).
 *
 * @param limit - Maximum number of articles to return (default 10)
 * @returns NewsResult with articles sorted by published_at descending
 */
export async function fetchPublishedNews(limit = 10): Promise<NewsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { articles: [], error: 'Not authenticated' };
  }

  const tenantId = user.app_metadata?.tenant_id ?? '';
  if (!tenantId) {
    return { articles: [], error: 'No tenant associated with this account' };
  }

  // Get user's role and stage from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, stage')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'student';
  const stage = profile?.stage ?? 'Senior School';

  // Map profiles.stage to content_group values
  const stageToContentGroup: Record<string, string> = {
    'Mid School': 'junior',
    'Senior School': 'senior',
    'Pre School': 'junior',
  };
  const contentGroup = stageToContentGroup[stage] ?? 'senior';

  let query = supabase
    .from('school_desk.news')
    .select('id, tenant_id, title, content, created_by, created_at, updated_at, published_at, content_group, category')
    .eq('tenant_id', tenantId)
    .not('published_at', 'is', null)
    .is('deleted_at', null);

  // Stage-based filtering for students and parents only
  if (role === 'student' || role === 'family') {
    query = query.or(`content_group.eq.general,content_group.eq.${contentGroup}`);
  }

  const { data, error } = await query
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { articles: [], error: error.message };
  }

  return {
    articles: (data ?? []) as NewsArticle[],
    error: null,
  };
}
