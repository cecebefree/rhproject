// factories/website-leads.factory.ts
// Test data builders for public.website_leads and related Edge Function payloads

export interface WebsiteLeadForm {
  family_first_name: string;
  family_last_name: string;
  family_email: string;
  family_phone?: string;
  family_relation_to_child?: string;
  family_primary_language?: string;
  family_preferred_currency?: string;
  family_primary_faith?: string;
  child_name: string;
  child_year_of_birth?: number;
  child_country_of_citizenship?: string;
  child_country_of_residency?: string;
  child_preferred_core_curriculum?: string;
  child_preferred_starting_grade?: string;
  child_preferred_starting_year?: number;
  child_intake_group?: string;
  zone_selection?: number;
  payment_method: "stripe" | "paypal";
  turnstile_token?: string;
}

export interface WebsiteLeadRow {
  id: string;
  email: string;
  name: string | null;
  family_first_name: string | null;
  family_last_name: string | null;
  family_email: string | null;
  family_phone: string | null;
  family_relation_to_child: string | null;
  family_primary_language: string | null;
  family_preferred_currency: string | null;
  family_primary_faith: string | null;
  child_name: string | null;
  child_year_of_birth: number | null;
  child_country_of_citizenship: string | null;
  child_country_of_residency: string | null;
  child_preferred_core_curriculum: string | null;
  child_preferred_starting_grade: string | null;
  child_preferred_starting_year: number | null;
  child_intake_group: string | null;
  zone_selection: number | null;
  payment_method: string | null;
  registration_id: string | null;
  archived_at: string | null;
  archive_reason: string | null;
  turnstile_token: string | null;
  ip_address: string | null;
  created_at: string;
  verified: boolean;
  message: string | null;
}

let _seq = 0;
function seq(): number {
  return ++_seq;
}

export function buildForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  const n = seq();
  return {
    family_first_name: `TestParent${n}`,
    family_last_name: `TestFamily${n}`,
    family_email: `test-parent-${n}@example.com`,
    family_phone: `+1555${String(n).padStart(7, "0")}`,
    family_relation_to_child: "mother",
    family_primary_language: "English",
    family_preferred_currency: "USD",
    family_primary_faith: "Christian",
    child_name: `TestChild${n}`,
    child_year_of_birth: 2015,
    child_country_of_citizenship: "ZA",
    child_country_of_residency: "ZA",
    child_preferred_core_curriculum: "Cambridge",
    child_preferred_starting_grade: "Grade 5",
    child_preferred_starting_year: 2026,
    child_intake_group: "Fall 2026",
    zone_selection: 2,
    payment_method: "stripe",
    turnstile_token: "test-turnstile-token",
    ...overrides,
  };
}

export function buildStripeForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  return buildForm({ payment_method: "stripe", ...overrides });
}

export function buildPayPalForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  return buildForm({ payment_method: "paypal", ...overrides });
}

export function buildMinimalForm(overrides: Partial<WebsiteLeadForm> = {}): WebsiteLeadForm {
  const n = seq();
  return {
    family_first_name: `MinParent${n}`,
    family_last_name: `MinFamily${n}`,
    family_email: `min-test-${n}@example.com`,
    child_name: `MinChild${n}`,
    payment_method: "stripe",
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
    family_first_name: `TestParent${n}`,
    family_last_name: `TestFamily${n}`,
    family_email: `test-${n}@example.com`,
    family_phone: `+1555000000${n}`,
    family_relation_to_child: "mother",
    family_primary_language: "English",
    family_preferred_currency: "USD",
    family_primary_faith: "Christian",
    child_name: `TestChild${n}`,
    child_year_of_birth: 2015,
    child_country_of_citizenship: "ZA",
    child_country_of_residency: "ZA",
    child_preferred_core_curriculum: "Cambridge",
    child_preferred_starting_grade: "Grade 5",
    child_preferred_starting_year: 2026,
    child_intake_group: "Fall 2026",
    zone_selection: 2,
    payment_method: "stripe",
    registration_id: null,
    archived_at: null,
    archive_reason: null,
    turnstile_token: "test-turnstile-token",
    ip_address: null,
    created_at: new Date().toISOString(),
    verified: true,
    message: null,
    ...overrides,
  };
}
