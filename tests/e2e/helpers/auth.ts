// helpers/auth.ts — Authentication helpers for E2E tests
// Handles login/signup via Supabase Auth API + page interactions

import { type Page, expect } from "@playwright/test";
import { TEST_USERS, type TestUsers } from "./db";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// ═══════════════════════════════════════════════════════════
// API-BASED LOGIN (fast, no UI)
// ═══════════════════════════════════════════════════════════

export async function loginViaAPI(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ═══════════════════════════════════════════════════════════
// PAGE-BASED LOGIN (for UI flow tests)
// ═══════════════════════════════════════════════════════════

export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to login (the app uses Supabase auth — inject token via cookie/localStorage)
  const token = await loginViaAPI(email, password);

  // Inject auth token into the page's Supabase client
  await page.addInitScript((accessToken: string) => {
    // Override localStorage to inject Supabase session
    const session = {
      access_token: accessToken,
      refresh_token: "",
      expires_in: 3600,
      expires_at: Date.now() / 1000 + 3600,
      token_type: "bearer",
      user: null,
    };
    localStorage.setItem(
      "sb-localhost-54321-auth-token",
      JSON.stringify(session)
    );
  }, token);
}

// ═══════════════════════════════════════════════════════════
// SETUP AUTH STATE (for authenticated tests)
// ═══════════════════════════════════════════════════════════

export async function setupAuthState(
  page: Page,
  role: keyof TestUsers
): Promise<void> {
  const user = TEST_USERS[role];
  await loginViaUI(page, user.email, user.password);
}

// ═══════════════════════════════════════════════════════════
// SIGN UP NEW USER
// ═══════════════════════════════════════════════════════════

export async function signupViaAPI(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Signup failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}
