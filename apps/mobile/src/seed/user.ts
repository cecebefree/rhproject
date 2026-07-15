// Seed user profile — BACKED table (profiles)
// Source: frozen Design 5

export interface SeedUser {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'family' | 'admin';
  curriculum: string;
  grade: string;
  stage: string;
  intake: string;
}

export const SEED_USER: SeedUser = {
  id: 'u1',
  name: 'Liam van der Berg',
  role: 'student',
  curriculum: 'Cambridge',
  grade: '8',
  stage: 'Mid School',
  intake: 'Group A · Jan',
};
