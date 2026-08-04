// T003 — LMS feature module routing (field-free per R23).
// Static path strings only. No :param segments, no loaders, no queries,
// no column/field bindings. Routing surface only.

export const LMS_ROUTE_BASE = '/lms' as const;

export interface LmsRouteEntry {
  readonly path: string;
  readonly name: string;
}

export const lmsRoutes: readonly LmsRouteEntry[] = [
  { path: '/lms', name: 'lms-index' },
  { path: '/lms/courses', name: 'lms-courses' },
  { path: '/lms/classes', name: 'lms-classes' },
  { path: '/lms/enrichment', name: 'lms-enrichment' },
  { path: '/lms/clubs', name: 'lms-clubs' },
  { path: '/lms/curriculum', name: 'lms-curriculum' },
  { path: '/lms/calendar', name: 'lms-calendar' },
  { path: '/lms/profile', name: 'lms-profile' },
  { path: '/lms/school-desk', name: 'lms-school-desk' },
] as const;
