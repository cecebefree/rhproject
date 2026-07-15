// Seed report card — BACKED table, terminal state 'visible'
// Source: frozen Design 8 + R18

export interface SeedCard {
  id: string;
  term: string;
  subject: string;
  grade: string;
  status: 'visible'; // Terminal state — learner sees immediately
  student: string;
}

export const SEED_CARDS: SeedCard[] = [
  {
    id: 'rc1',
    term: 'Term 1 2026',
    subject: 'Mathematics',
    grade: 'A',
    status: 'visible',
    student: 'Liam van der Berg',
  },
];
