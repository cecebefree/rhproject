// Seed hubs (enrichment/OTT) — PLANNED fields render from seed only
// Source: frozen Design 7 (teacher variant) + field-register hub fields

export interface SeedHub {
  id: string;
  title: string;
  typeMeta: string;
  status: 'live' | 'upcoming' | 'completed';
  location: string;
  stage: string;
}

export const SEED_HUBS: SeedHub[] = [
  {
    id: 'h1',
    title: 'Finance 101 — Module 3',
    typeMeta: 'Enrichment · 42 min remaining',
    status: 'upcoming',
    location: 'Tokyo, Japan',
    stage: 'Mid School',
  },
  {
    id: 'h2',
    title: 'Creative Writing Workshop',
    typeMeta: 'Enrichment · Self-paced',
    status: 'completed',
    location: 'Online',
    stage: 'Senior School',
  },
];
