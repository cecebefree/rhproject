// Seed messages — PLANNED fields render from seed only
// Source: frozen chat adjustments + ITEM-001 engineering conditions

export interface SeedMessage {
  id: string;
  senderName: string;
  senderHandle: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export const SEED_MESSAGES: SeedMessage[] = [
  {
    id: 'm1',
    senderName: 'Chef Tanaka',
    senderHandle: '@chef.tanaka',
    content: 'Welcome! Today we make Ramen',
    timestamp: '14:50',
    isOwn: false,
  },
  {
    id: 'm2',
    senderName: 'Liam van der Berg',
    senderHandle: '@liam',
    content: 'So excited! Miso paste is ready.',
    timestamp: '14:52',
    isOwn: true,
  },
  {
    id: 'm3',
    senderName: 'Chef Tanaka',
    senderHandle: '@chef.tanaka',
    content: 'Chicken works beautifully',
    timestamp: '14:55',
    isOwn: false,
  },
  {
    id: 'm4',
    senderName: 'Zoe Mitchell',
    senderHandle: '@zoe',
    content: 'Can I use chicken instead?',
    timestamp: '14:53',
    isOwn: false,
  },
];
