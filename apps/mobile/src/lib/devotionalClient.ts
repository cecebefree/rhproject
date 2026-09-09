// devotionalClient.ts — Supabase RPC client for daily devotional content
// Calls get_today_devotional() which returns tile-based content scoped
// to the caller's tenant, role, and content_group via JWT claims.

import { supabase } from '../services/supabase';

// ─── TYPES ────────────────────────────────────────────────────

/** Tile type returned by the RPC — each maps to a devotional section */
export type DevotionalTile = 'verse' | 'bible_365' | 'music' | 'vlog';

/** Raw row returned by get_today_devotional() RPC */
export interface DevotionalRow {
  tile: DevotionalTile;
  ref: string | null;
  content: string | null;
  title: string | null;
  day: number | null;
}

/** Parsed devotional items grouped by tile type */
export interface DevotionalData {
  verse: DevotionalRow | null;
  biblePlan: DevotionalRow | null;
  music: DevotionalRow | null;
  vlog: DevotionalRow | null;
}

/** Result wrapper following codebase convention */
export interface DevotionalResult {
  data: DevotionalData;
  error: string | null;
}

// ─── RPC CALL ─────────────────────────────────────────────────

/**
 * Fetch today's devotional content via the get_today_devotional() RPC.
 *
 * The RPC reads tenant_id, role, and content_group from the caller's JWT
 * (set by custom_access_token_hook) and returns rows the user is allowed
 * to see via role_feature_access + content_group policies.
 *
 * No parameters needed — the RPC is fully JWT-driven.
 *
 * @returns DevotionalResult with items grouped by tile type
 */
export async function fetchTodayDevotional(): Promise<DevotionalResult> {
  const { data: rows, error } = await supabase.rpc('get_today_devotional');

  if (error) {
    return {
      data: { verse: null, biblePlan: null, music: null, vlog: null },
      error: error.message,
    };
  }

  if (!rows || rows.length === 0) {
    return {
      data: { verse: null, biblePlan: null, music: null, vlog: null },
      error: null,
    };
  }

  const data: DevotionalData = {
    verse: null,
    biblePlan: null,
    music: null,
    vlog: null,
  };

  for (const row of rows as DevotionalRow[]) {
    switch (row.tile) {
      case 'verse':
        data.verse = row;
        break;
      case 'bible_365':
        data.biblePlan = row;
        break;
      case 'music':
        data.music = row;
        break;
      case 'vlog':
        data.vlog = row;
        break;
    }
  }

  return { data, error: null };
}
