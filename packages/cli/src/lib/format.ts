// ANSI color helpers (no dependency needed)
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

export function badge(text: string, bg: string): string {
  return `${bg}${c.bold} ${text} ${c.reset}`;
}

export function hotBadge(): string { return badge('HOT', c.red); }
export function warmBadge(): string { return badge('WARM', c.yellow); }
export function nurtureBadge(): string { return badge('NURTURE', c.blue); }
export function blockedBadge(): string { return badge('BLOCKED', c.gray); }

export function aiBadge(category: string | null): string {
  switch (category) {
    case 'hot_lead': return hotBadge();
    case 'warm': return warmBadge();
    case 'nurture': return nurtureBadge();
    case 'blocked': return blockedBadge();
    default: return badge('???', c.gray);
  }
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + '...';
}
