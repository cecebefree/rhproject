// Seed classes — PLANNED fields render from seed only
// Source: frozen Design 7 (teacher variant) + field-register class fields

export interface SeedClass {
  id: string;
  subject: string;
  teacher: string;
  schedule: string;
  location: string;
  status: 'live' | 'upcoming' | 'completed';
}

export const SEED_CLASSES: SeedClass[] = [
  {
    id: 'c1',
    subject: 'Mathematics',
    teacher: 'Mr. Olivier',
    schedule: 'Mon/Wed/Fri · 10:00',
    location: 'Room 204',
    status: 'upcoming',
  },
  {
    id: 'c2',
    subject: 'English Literature',
    teacher: 'Ms. Carter',
    schedule: 'Tue/Thu · 11:00',
    location: 'Room 108',
    status: 'upcoming',
  },
  {
    id: 'c3',
    subject: 'Physics',
    teacher: 'Dr. Nakamura',
    schedule: 'Mon/Wed · 14:00',
    location: 'Lab 3',
    status: 'live',
  },
];
