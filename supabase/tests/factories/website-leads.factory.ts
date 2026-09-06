// factories/website-leads.factory.ts
// Test data builders for public.website_leads and related Edge Function payloads
// Updated to match actual schema: id, email, name, message, turnstile_token, ip_address, created_at, verified, updated_at

export interface WebsiteLeadForm {
  email: string;
  name?: string;
  message?: string;
  turnstile_token?: string;
}

export interface WebsiteLeadRow {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  turnstile_token: string | null;
  ip_address: string | null;
  created_at: string;
  verified: boolean;
  updated_at: string | null;
}

let _seq = 0;
function seq(): number {
  return ++_seq;
}

export function buildForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  const n = seq();
  return {
    email: `test-parent-${n}@example.com`,
    name: `TestParent${n} TestFamily${n}`,
    message: `Inquiry from test parent ${n}`,
    turnstile_token: "test-turnstile-token",
    ...overrides,
  };
}

export function buildStripeForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  return buildForm({ ...overrides });
}

export function buildPayPalForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  return buildForm({ ...overrides });
}

export function buildMinimalForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  const n = seq();
  return {
    email: `min-test-${n}@example.com`,
    name: `MinParent${n} MinFamily${n}`,
    ...overrides,
  };
}

// For database row assertions
export function buildLeadRow(overrides: Partial<WebsiteLeadRow> = {}): WebsiteLeadRow {
  const n = seq();
  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: `test-${n}@example.com`,
    name: `TestParent${n} TestFamily${n}`,
    message: null,
    turnstile_token: "test-turnstile-token",
    ip_address: null,
    created_at: new Date().toISOString(),
    verified: true,
    updated_at: null,
    ...overrides,
  };
}
