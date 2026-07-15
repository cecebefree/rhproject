// Seed groups — PLANNED fields render from seed only
// Source: frozen Design 5 + ITEM-001 seven categories

import { CategoryKey } from '../theme/colors';

export interface SeedGroup {
  id: string;
  name: string;
  category: CategoryKey;
  lead: string;
  memberCount: number;
  lastMessage?: string;
}

export const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'g1',
    name: 'Culinary Club',
    category: 'club',
    lead: 'Chef Tanaka',
    memberCount: 12,
    lastMessage: 'Chef Tanaka: See you at 15:30',
  },
  {
    id: 'g2',
    name: 'Grade 8A Class',
    category: 'core',
    lead: 'Mr. Olivier',
    memberCount: 28,
    lastMessage: 'Mr. Olivier: Homework due Friday',
  },
  {
    id: 'g3',
    name: 'Entrepreneurs Club',
    category: 'club',
    lead: 'Mr. Steyn',
    memberCount: 15,
    lastMessage: 'Welcome to the group!',
  },
];
