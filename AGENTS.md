# AGENTS.md — vas-edutech (Redhouse)

Source of truth: tech-stack.md — read fully first.

**Source of truth:** `tech-stack.md` (repo root). Read it fully before planning or editing.

---

## Current State

Single Vite + React 19 app at repo root (`redhouse-real-web`). **Migrating to pnpm + Turborepo monorepo** (`vas-edutech`) with:
- `apps/web` — React + Vite → Cloudflare Pages (current app moves here)
- `apps/mobile` — Capacitor iOS → TestFlight/App Store (new)
- `apps/lms` — Tauri 2.0 + React → Desktop (new, AI isolated here)
- `packages/shared` — Supabase client, RLS helpers, validation, generated types
- `supabase/` — 12 migrations, 6 Edge Functions, pgTAP tests
- `tenants/redhouse/` — Tenant #1 config; `_template/` for new tenants

---

## Key Commands (from tech-stack.md)

```bash
# Local bootstrap (Docker, Supabase, types, deps)
make setup

# Regenerate Supabase types → packages/shared/src/types/database.ts
make types

# Dev servers
make dev

# Build all apps
make build:all

# Run pgTAP tests
make test

# Lint (Biome)
make lint

# Typecheck
make typecheck
```

**Type generation:**
```bash
supabase gen types typescript --local > packages/shared/src/types/database.ts
```
Committed to repo. CI drift guard fails on diff.

---

## CI Hard Rules (3 Guards)

1. **AI-import guard** — Fail if `apps/web/**` or `apps/mobile/**` import from `apps/lms/src/ai/**` or any AI SDK (openai, anthropic, @langchain, etc.)
2. **Platform/tenant import guard** — Fail if `apps/lms/**` or `apps/mobile/**` (engine code) import from `tenants/**`
3. **Type-drift guard** — Fail if `supabase gen types` output diffs vs committed `packages/shared/src/types/database.ts`

---

## AI Isolation

**Only** `apps/lms/src/ai/` contains AI code (engine, RAG, tutor assembly). Mobile has ONE AI screen (AI Tutor) calling `ai-tutor-proxy` Edge Function. Web has **zero** AI imports.

---

## Environment Variables

| Status | Variables |
|--------|-----------|
| **READY** (in `.env`) | `VITE_GA4_ID`, `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS), `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT` |
| **TODO** (`.env.example`) | `WEB3FORMS_KEY`, `BREVO_API_KEY`, `BOTPRESS_KEY`, `CLOUDINARY_URL`, `SENTRY_DSN`, `NEMOTRON_ENDPOINT`, `NEMOTRON_KEY` |

**Never commit secret values.** `SUPABASE_SERVICE_ROLE_KEY` is Edge Functions only.

---

## Architecture Notes

- **Supabase = authoritative.** HubSpot is sync-only (outbound Supabase → HubSpot via nightly reconciliation + webhook).
- **RLS:** Web tables = role-only. LMS/Mobile tables = role + `tenant_id`. pgTAP tests for both.
- **Time:** All instants stored as `timestamptz` (UTC). Convert to local ONLY on display. pg_cron runs in UTC; schedule in UTC.
- **Edge Functions (6):** `verify-turnstile`, `nightly-reconciliation`, `hubspot-webhook`, `class-start-ping`, `validate-toggle`, `ai-tutor-proxy`

---

## Workflow

1. **Plan mode** — Read `tech-stack.md`, investigate, propose plan. Stop for approval.
2. **Build mode** — Execute approved plan. Write files, run commands.
3. **Stay in plan mode** until user explicitly switches.

---

## Gotchas

- Current `netlify.toml` → will become `wrangler.toml` (Cloudflare Pages)
- Current ESLint → will become Biome
- Rust crates: `reqwest` **must use rustls-tls** (not native-tls)
- Apple Developer account = TODO (deferred signing for Tauri + Capacitor)
- Redhouse brand hex codes + logo = TODO
- Cambridge `billing_basis` = TODO (awaiting licence)