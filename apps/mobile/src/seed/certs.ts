// Seed certificate — BACKED table, status 'issued'
// Source: frozen ITEM-002

export interface SeedCert {
  id: string;
  class: 'club_attendance' | 'enrichment' | 'core_subject' | 'year_completion' | 'graduation';
  title: string;
  status: 'issued';
  signatory: string;
  issuedAt: string;
}

export const SEED_CERTS: SeedCert[] = [
  {
    id: 'cert1',
    class: 'enrichment',
    title: 'Finance 101 — Module 3 Completion',
    status: 'issued',
    signatory: 'Mr. Olivier',
    issuedAt: '2026-06-15',
  },
];
