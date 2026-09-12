// scheduleClient.ts — Master schedule client with section-based filtering
// Aggregates events from LMS (classes), OTT (clubs), and Social (group chats)
// Section filter: home=all, class=LMS only, hub=OTT only, social=group-chat only

import { supabase } from '../services/supabase';

// ─── TYPES ────────────────────────────────────────────────────

/** Source system that produced the scheduled event */
export type ScheduleSource = 'lms' | 'ott' | 'social';

/** Section filter — each page shows a different slice of the master schedule */
export type ScheduleSection = 'home' | 'class' | 'hub' | 'social';

/** Unified schedule event — normalized from all source tables */
export interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  source: ScheduleSource;
  /** Day of week (0=Sun … 6=Sat) — null for one-off events */
  day_of_week: number | null;
  /** Source-specific metadata for rendering */
  color: string | null;
  /** Original table row ID for navigation */
  source_id: string;
  /** Additional metadata from the source */
  meta: Record<string, unknown>;
}

/** Result wrapper following the codebase convention */
export interface ScheduleResult {
  events: ScheduleEvent[];
  error: string | null;
}

// ─── SOURCE COLORS ────────────────────────────────────────────

const SOURCE_COLORS: Record<ScheduleSource, string> = {
  lms: '#3B82F6',    // blue — classes
  ott: '#10B981',    // green — clubs / enrichment
  social: '#8B5CF6', // purple — group chat
};

// ─── SECTION → SOURCE MAPPING ─────────────────────────────────

/** Which sources each section displays */
const SECTION_SOURCES: Record<ScheduleSection, ScheduleSource[]> = {
  home:   ['lms', 'ott', 'social'],
  class:  ['lms'],
  hub:    ['ott'],
  social: ['social'],
};

// ─── INTERNAL FETCHERS ────────────────────────────────────────

/**
 * Fetch LMS scheduled events from enrollments + chapters.
 * Joins through student_class → courses → schedule_slot to get times.
 */
async function fetchLmsEvents(userId: string): Promise<ScheduleEvent[]> {
  // 1. Get user's active enrollments (handles both student and adult/parent)
  const studentIds = await resolveStudentIds(userId);

  if (studentIds.length === 0) return [];

  // 2. Fetch enrolled class IDs
  const { data: enrollments, error: enrErr } = await supabase
    .schema('public').from('student_class')
    .select('class_id')
    .in('student_id', studentIds)
    .eq('is_active', true);

  if (enrErr || !enrollments || enrollments.length === 0) return [];

  const classIds = [...new Set(enrollments.map((e) => e.class_id))];

  // 3. Fetch course details + schedule slots in parallel
  const [coursesResult, slotsResult] = await Promise.all([
    supabase
      .schema('public').from('courses')
      .select('id, title, description, type, platform')
      .in('id', classIds),
    supabase
      .schema('public').from('schedule_slot')
      .select('id, course_id, label, start_time, end_time, days_of_week')
      .in('course_id', classIds)
      .eq('is_active', true),
  ]);

  const courses = coursesResult.data ?? [];
  const slots = slotsResult.data ?? [];

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  // 4. Expand weekly recurring slots into individual ScheduleEvents
  const events: ScheduleEvent[] = [];

  for (const slot of slots) {
    const course = courseMap.get(slot.course_id);
    if (!course) continue;

    const days: number[] = Array.isArray(slot.days_of_week) ? slot.days_of_week : [];

    if (days.length === 0) {
      // One-off event — use start_time directly
      events.push({
        id: `lms-${slot.id}`,
        title: slot.label ?? course.title,
        description: course.description ?? null,
        start_time: slot.start_time,
        end_time: slot.end_time ?? null,
        source: 'lms',
        day_of_week: null,
        color: SOURCE_COLORS.lms,
        source_id: course.id,
        meta: { course_type: course.type, platform: course.platform },
      });
      continue;
    }

    // Recurring: one event per day of week
    for (const dow of days) {
      events.push({
        id: `lms-${slot.id}-${dow}`,
        title: slot.label ?? course.title,
        description: course.description ?? null,
        start_time: slot.start_time,
        end_time: slot.end_time ?? null,
        source: 'lms',
        day_of_week: dow,
        color: SOURCE_COLORS.lms,
        source_id: course.id,
        meta: { course_type: course.type, platform: course.platform, day_of_week: dow },
      });
    }
  }

  return events;
}

/**
 * Fetch OTT (enrichment / club) scheduled events from clubs table.
 */
async function fetchOttEvents(): Promise<ScheduleEvent[]> {
  const { data: clubs, error } = await supabase
    .schema('public').from('clubs')
    .select('id, name, description, schedule, category')
    .order('name');

  if (error || !clubs) return [];

  const events: ScheduleEvent[] = [];

  for (const club of clubs) {
    const schedule = club.schedule as Record<string, unknown> | null;
    const day = schedule?.day as string | undefined;
    const time = schedule?.time as string | undefined;
    const duration = schedule?.duration as number | undefined;

    const dayIndex = day ? dayNameToIndex(day) : null;

    // Compute end_time from start + duration if available
    let end_time: string | null = null;
    if (time && typeof duration === 'number' && duration > 0) {
      end_time = addMinutes(time, duration);
    }

    events.push({
      id: `ott-${club.id}`,
      title: club.name,
      description: club.description ?? null,
      start_time: time ?? '',
      end_time,
      source: 'ott',
      day_of_week: dayIndex,
      color: SOURCE_COLORS.ott,
      source_id: club.id,
      meta: { category: club.category ?? null },
    });
  }

  return events;
}

/**
 * Fetch Social (group-chat) scheduled events.
 * Only includes groups with a non-null scheduled_event timestamp.
 */
async function fetchSocialEvents(): Promise<ScheduleEvent[]> {
  const { data: groups, error } = await supabase
    .schema('public').from('group_conversations')
    .select('id, name, type, scheduled_event')
    .not('scheduled_event', 'is', null)
    .order('scheduled_event');

  if (error || !groups) return [];

  return groups.map((g) => {
    const eventTime = g.scheduled_event as string;
    const startDate = new Date(eventTime);

    return {
      id: `social-${g.id}`,
      title: g.name,
      description: null,
      start_time: eventTime,
      end_time: null,
      source: 'social',
      day_of_week: startDate.getDay(),
      color: SOURCE_COLORS.social,
      source_id: g.id,
      meta: { group_type: g.type ?? null },
    };
  });
}

// ─── AUTH HELPER ──────────────────────────────────────────────

/**
 * Resolve student IDs for the current user.
 * - If the user IS a student, returns [userId].
 * - If the user is an adult/parent, returns their linked children.
 */
async function resolveStudentIds(userId: string): Promise<string[]> {
  // Check if user is a student via profile role
  const { data: profile } = await supabase
    .schema('public').from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'student') {
    return [userId];
  }

  // Adult/parent: fetch linked children
  const { data: links } = await supabase
    .schema('public').from('family_child')
    .select('child_id')
    .eq('guardian_id', userId);

  return (links ?? []).map((l) => l.child_id);
}

// ─── PUBLIC API ───────────────────────────────────────────────

/**
 * Fetch scheduled events filtered by section.
 *
 * @param section - Which page is requesting:
 *   - 'home'   → all sources (LMS + OTT + social)
 *   - 'class'  → LMS only (classes / curriculum)
 *   - 'hub'    → OTT only (clubs / enrichment)
 *   - 'social' → group-chat only
 * @param tenantId - Current tenant ID (for multi-tenant scoping)
 * @returns ScheduleResult with unified events sorted by start_time
 */
export async function fetchScheduleBySection(
  section: ScheduleSection,
  tenantId: string,
): Promise<ScheduleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { events: [], error: 'Not authenticated' };
  }

  if (!tenantId) {
    return { events: [], error: 'No tenant specified' };
  }

  const sources = SECTION_SOURCES[section];
  if (!sources || sources.length === 0) {
    return { events: [], error: `Unknown section: ${section}` };
  }

  // Fetch from each source in parallel
  const fetchers: Partial<Record<ScheduleSource, () => Promise<ScheduleEvent[]>>> = {
    lms: () => fetchLmsEvents(user.id),
    ott: fetchOttEvents,
    social: fetchSocialEvents,
  };

  const activeFetchers = sources.map((s) => fetchers[s]).filter((fn): fn is () => Promise<ScheduleEvent[]> => fn != null);
  const results = await Promise.allSettled(activeFetchers.map((fn) => fn()));

  // Collect events, tracking which fetchers failed
  const events: ScheduleEvent[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = sources[i];

    if (result.status === 'fulfilled') {
      events.push(...result.value);
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`[${source}] ${msg}`);
    }
  }

  // Sort by start_time ascending — events with empty start_time go last
  events.sort((a, b) => {
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  return {
    events,
    error: errors.length > 0 ? errors.join('; ') : null,
  };
}

/**
 * Fetch all scheduled events across all sources (no filtering).
 * Convenience wrapper for fetchScheduleBySection('home', tenantId).
 */
export async function fetchMasterSchedule(
  tenantId: string,
): Promise<ScheduleResult> {
  return fetchScheduleBySection('home', tenantId);
}

// ─── UTILITIES ────────────────────────────────────────────────

/** Convert day name (e.g. 'monday') to 0-6 index (Sun=0 … Sat=6) */
function dayNameToIndex(day: string): number | null {
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return map[day.toLowerCase()] ?? null;
}

/** Add minutes to an HH:MM time string, returns HH:MM */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;

  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
