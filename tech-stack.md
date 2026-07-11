# VAS EDUTECH — Tech Stack Blueprint

> **RECONCILIATION NOTE — 2026-07-11:** `ai-operations-plan.md` ships alongside this file as the governing AI-ops doctrine. Per Principal ruling: **tech-stack.md wins on stack facts; ai-operations-plan.md wins on AI-ops doctrine.** Sections overridden by the AI-ops plan are marked below. Read both files at session start.

**Project:** vas-edutech (Redhouse = tenant #1)
**Purpose:** White-label education platform — three surfaces, single Supabase backend
**Surfaces:** Web (Cloudflare Pages), iOS (Capacitor), Desktop LMS (Tauri 2.0)

> Migration note: Migrated from single Vite app at repo root → pnpm + Turborepo monorepo.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   apps/web    │  │ apps/mobile   │  │  apps/lms     │
│  (React/Vite) │  │ (Capacitor)   │  │  (Tauri 2.0)  │
│ Cloudflare    │  │ iOS only      │  │  Desktop      │
│ Pages         │  │ 5 screens     │  │ 7 screens     │
│ No AI         │  │ No AI*        │  │ AI Tutor      │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │
                    │  (Postgres) │
                    │  Pro Tier   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Edge Functions│  │   Auth        │  │   Storage     │
│ (6 functions) │  │  (Apple +     │  │  (Files,      │
│               │  │   social,     │  │   certs,      │
│               │  │   entrance)   │  │   notes)      │
└───────────────┘  └───────────────┘  └───────────────┘
        │
        ▼
┌───────────────┐
│  External     │
│  Services     │
│ (HubSpot,     │
│  Turnstile,   │
│  GA4, etc.)   │
└───────────────┘

* Mobile has ONE AI screen (AI Tutor) calling ai-tutor-proxy Edge Function
```

**Data Flow:** All frontends → Supabase (Postgres) via `packages/shared` Supabase client. Edge Functions handle server-side logic (Turnstile, reconciliation, class pings, validation, AI proxy). External services (~~HubSpot~~ *struck per ai-ops-plan §6*, Turnstile, GA4, Zoom/Meet, Muvi) called from Edge Functions or client where appropriate.

**Source of Truth:** Supabase is authoritative. ~~HubSpot is **sync-only** (outbound Supabase → HubSpot via nightly reconciliation + webhook). No inbound HubSpot → entitlements.~~ **OVERRIDDEN by ai-ops-plan §6 — HubSpot struck. Leads live natively in Supabase.**

---

## Tech Stack

| Layer | Tool | Version |
|-------|------|---------|
| Monorepo | pnpm + Turborepo | TODO |
| Frontend Framework | React | 19.2.7 |
| Build Tool | Vite | 8.0.12 |
| Language | TypeScript | 6.0.2 |
| Styling | Tailwind CSS | 4.3.1 |
| Desktop (LMS) | Tauri | 2.0 (TODO exact version) |
| Mobile | Capacitor | iOS-only (TODO version) |
| Backend / Database | Supabase (Postgres) | Pro tier (TODO version) |
| Hosting (Web) | Cloudflare Pages | — |
| Edge Runtime | Supabase Edge Functions | — |
| Vector Store | pgvector (in Postgres) | — |
| Database Testing | pgTAP | — |
| Lint / Format | Biome | TODO version |
| CI / CD | GitHub Actions | — |

> Build-time coding via Nemotron through OpenCode (not a runtime dependency).
> React: 19.2.7 (confirmed live on disk 2026-07-03; any earlier note assuming React 18 is superseded).

---

## Directory Layout

```
vas-edutech/
├── apps/
│   ├── web/                 # React + Vite → Cloudflare Pages
│   ├── mobile/              # Capacitor iOS → TestFlight / App Store
│   └── lms/                 # Tauri 2.0 → Desktop (Linux/macOS/Windows)
├── packages/
│   └── shared/              # Tenant resolver, RLS helpers, validation, generated types
├── tenants/
│   ├── _template/           # Template for new tenants
│   │   ├── web/
│   │   ├── mobile/
│   │   └── lms/
│   └── redhouse/            # Tenant #1 (actual config)
│       ├── web/
│       ├── mobile/
│       └── lms/
├── supabase/
│   ├── config.toml
│   ├── migrations/          # 12 migrations (001–012)
│   ├── functions/           # 6 Edge Functions
│   └── pg_tap/              # pgTAP tests
├── docker/                  # Dockerfile, docker-compose.yml
├── .devcontainer/           # devcontainer.json
├── .github/workflows/       # CI/CD with hard-rule guards
├── pnpm-workspace.yaml
├── turbo.json
├── package.json (root)
├── biome.json
├── Makefile
└── tsconfig.base.json
```

**Platform-Specific Folders & CI Guards:**
- `apps/web/**` — **Blocked from importing** `apps/lms/src/ai/**` or any AI SDK (openai, anthropic, @langchain, etc.)
- `apps/mobile/**` — **Blocked from importing** `apps/lms/src/ai/**` or any AI SDK
- `apps/lms/**` and `apps/mobile/**` (engine code) — **Blocked from importing** `tenants/**`
- `tenants/**` — Pure config only; no platform logic allowed

> Migration note: Flat → monorepo (apps/, packages/, supabase/, tenants/).

---

## Multi-Surface Implementation Guidelines

### Web (`apps/web/`)
- **Framework:** React 19 + Vite 8
- **Build:** `vite build` → `dist/`
- **Deploy:** Cloudflare Pages via `wrangler.toml` (build command, output dir, env vars, bindings)
- **AI:** **None** — enforcement via CI guard

### Desktop LMS (`apps/lms/`)
- **Framework:** Tauri 2.0 + React 19 (WebKit webview, ~10 MB binary)
- **Rust Crates:** `tauri`, `tauri-plugin-*`, `pdf-writer`, `reqwest` (**rustls-tls**, not native-tls), `serde`, `serde_json`, `tokio`, `tauri-plugin-store`, `tauri-plugin-deep-link`, `keyring`, `thiserror`, `anyhow`, `chrono`
- **AI Isolation:** **Only** `apps/lms/src/ai/` contains AI code (engine, RAG, tutor assembly)
- **Screens:** 7 modules (dashboard, lessons, files, bookshelf, homework, schedule, AI tutor)
- **Build:** `tauri build` → platform binaries + GitHub Releases
- **Note:** Apple Developer account = TODO (deferred signing)

<!-- TODO: LMS screen detail (7) from lms-structure.md -->

### iOS Mobile (`apps/mobile/`)
- **Framework:** Capacitor + React 19 (iOS only)
- **Capacitor Plugins:** `@capacitor/push-notifications` (APNs via .p8 Auth Key), `@capacitor-community/biometric` (Face ID/Touch ID), `@capacitor/preferences` + iOS Keychain (secure Supabase session storage)
- **Auth Source of Truth:** Supabase Auth (session persisted in Keychain)
- **Screens:** 5 modules (Dashboard, Lessons, Homework, Schedule, AI Tutor)
- **AI:** Single AI Tutor screen only — calls `ai-tutor-proxy` Edge Function
- **Build:** `cap build ios` → Xcode → TestFlight / App Store
- **Note:** Apple Developer account = TODO (deferred signing)

<!-- TODO: mobile screen detail (5) from mobile-structure.md -->

### Shared Package (`packages/shared/`)
- **Generated Types:** `supabase gen types typescript --local > packages/shared/src/types/database.ts` (committed)
- **Exports:**
  - `@vas/shared/api` — Supabase client, typed RPC, DB types
  - `@vas/shared/auth` — Role guards, `getUserRole`, `hasPermission`, Role enum
  - `@vas/shared/validation` — `truncate.ts` (28-char server-side), `turnstile.ts`, `toggles.ts` (12 toggles)
  - `@vas/shared/tenant` — Resolver, React context, `TenantConfig`, `TenantBranding`
  - `@vas/shared/ui` — Primitives (Button, Input, Card, Modal), Layout (Container, Grid, Stack)
  - `@vas/shared/hooks` — `useAuth`, `useTenant`, `useFeatureToggle`
  - `@vas/shared/utils` — `cn`, `date`, `formatting`
  - `@vas/shared/constants` — Roles, status (pending_init → active), limits

---

## Backend & Edge

### Supabase Configuration
- **Local Dev:** `supabase start` (Docker) via devcontainer / `make setup`
- **Staging/Prod:** Remote Supabase project
- **Config:** `supabase/config.toml` committed

### RLS Approach
- **Web tables:** Role-only (student / parent / teacher / admin)
  - JWT role → `auth.user_role()` → role helper → pgTAP verified
- **LMS / Mobile tables:** Role + `tenant_id`
- **pgTAP Tests:** Role isolation + tenant isolation (`test_tenant_isolation.sql`)

### Type Generation
```bash
supabase gen types typescript --local > packages/shared/src/types/database.ts
```
- Committed to repo
- CI drift guard fails on diff vs committed file
- `make types` regenerates

### Edge Functions (6)

| Function | Purpose |
|----------|---------|
| `verify-turnstile` | Server-side Turnstile verification before any write |
| `nightly-reconciliation` | ~~Nightly Supabase ↔ HubSpot reconciliation (flags enrolment gaps)~~ **OVERRIDDEN by ai-ops-plan §6 — HubSpot struck. Rework into Supabase-native pipeline.** |
| `hubspot-webhook` | ~~**OUTBOUND** Supabase → HubSpot sync (scheduled push)~~ **OVERRIDDEN by ai-ops-plan §6 — HubSpot struck.** |
| `class-start-ping` | Session-start notifications (triggered by pg_cron) |
| `validate-toggle` | 28-char truncation (26 + ellipsis) + feature toggle validation |
| `ai-tutor-proxy` | Content-scoped RAG calls (LMS only; enforces tenant + content scope) |

> Migration note: All new — 12 migrations, 6 Edge Functions.

---

## Conventions & Guardrails

### CI Hard Rules (3 Guards)
1. **AI-import guard** — Fail build if `apps/web/**` or `apps/mobile/**` import from `apps/lms/src/ai/**` or any AI SDK
2. **Platform/tenant import guard** — Fail build if `apps/lms/**` or `apps/mobile/**` (engine code) import from `tenants/**`
3. **Type-drift guard** — Fail build if `supabase gen types` output diffs vs committed `packages/shared/src/types/database.ts`

### Make Targets
| Target | Purpose |
|--------|---------|
| `make setup` | Full local bootstrap (Docker, Supabase, types, deps) |
| `make types` | Regenerate Supabase types |
| `make dev` | Start all dev servers |
| `make build:all` | Build all apps |
| `make test` | Run pgTAP tests |
| `make lint` | Run Biome |
| `make typecheck` | Run TypeScript |

### Local Development
- `supabase start` in Docker/devcontainer (Rust, Tauri CLI, Supabase CLI preinstalled)
- Remote Supabase for staging/preview only

> Migration note: ESLint → Biome; add 3 CI guards; add make targets.

---

## Environment Variables

**READY (configured in `.env` — names only, values stay in secrets manager):**
- `VITE_GA4_ID`
- `HUBSPOT_PORTAL_ID`
- `HUBSPOT_FORM_ID`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **Server-only** (Edge Functions), bypasses RLS, git-ignored, never shipped to client
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT`

**TODO (placeholders in `.env.example`):**
- `WEB3FORMS_KEY`, `BREVO_API_KEY`, `BOTPRESS_KEY`, `CLOUDINARY_URL`
- `SENTRY_DSN`, `NEMOTRON_ENDPOINT`, `NEMOTRON_KEY`

---

## Localization (i18n)
<!-- TODO: confirm details in LMS + iOS sessions -->
- Default + supported languages (LMS, iOS): TODO
- i18n library/approach (web/LMS): TODO
- iOS localization: Localizable.strings / InfoPlist.strings + App Store localized metadata: TODO
- Translation file location (packages/shared vs per-tenant): TODO
- Per-tenant language overrides (_template vs redhouse): TODO
- Locale-aware date/number formatting (display layer): TODO

---

## Time & Scheduling Conventions
- Store all instants as `timestamptz` (UTC internally); convert to local ONLY on display.
- Schedule-intent values ("9 AM local") = `timestamp` + IANA timezone column.
- pg_cron / Supabase Cron runs in **UTC/GMT by default**; schedule in UTC and compute per-region target times — do NOT rely on `cron.timezone` (PG16-only, not settable on some managed platforms).
- DST policy: make `class-start-ping` and `nightly-reconciliation` handlers **idempotent** (2:30 AM jobs get skipped on spring-forward; 1:30 AM jobs run twice on fall-back).
- Store `user.timezone` (IANA name) in profile; render local time on web/iOS/LMS.
- `tstzrange` booking guards stay UTC-based (already tz-safe).
- Schedule a `cron.job_run_details` cleanup job (delete rows older than 7 days).
- API I/O in ISO 8601 UTC; ties to i18n locale formatting above.

---

## TODO Placeholders (Genuine Open Items)

| Category | Items |
|----------|-------|
| Versions | pnpm, Turborepo, Tauri CLI, Supabase CLI, Biome |
| Redhouse Brand | Primary/secondary hex codes, logo asset path |
| Cambridge | `billing_basis` (awaiting licence confirmation) |
| Apple | Developer account (deferred signing) |
| External | Sentry DSN, PostHog keys, Nemotron endpoint/key (if not OpenCode built-in) |

---

<!-- TODO: AI module detail from ai-structure.md -->

---

## Governance

**Non-negotiable rules enforced by architecture, CI, and review:**

| Rule | Enforcement |
|------|-------------|
| **Tenant isolation** — Every row in every table must be tenant-scoped. Redhouse = tenant #1. Zero cross-tenant leakage. | RLS policies on ALL tables; `tenant_id` on all LMS/mobile tables; pgTAP tests for tenant isolation |
| **RLS on all tables** — No table without Row-Level Security. | Migration 012_tenant_rls.sql; pgTAP `test_tenant_isolation.sql`; CI runs pgTAP |
| **`SUPABASE_SERVICE_ROLE_KEY` server-only** — Bypasses RLS. Never in client bundles, never in mobile/LMS binaries, never committed. | Edge Functions only; git-ignored; CI scans for secret patterns |
| **AI calls through `ai-tutor-proxy` edge function** — Browser never calls AI providers directly. | CI guard blocks AI SDK imports in `apps/web/**` and `apps/mobile/**`; mobile AI screen calls only `ai-tutor-proxy` |
| **WCAG AA** — All surfaces meet AA contrast, keyboard nav, ARIA, focus management. | Biome + lint rules; manual audit in CI |
| **No `any` type** — TypeScript strict mode; `noExplicitAny: true`. | `tsconfig.base.json` enforces; CI typecheck fails on `any` |

---

## Memory & Governance Anchor

Read these files **first** before planning or editing:

- **`tech-stack.md`** (this file) — Definitive architecture reference
- **`best-practices.md`** — CI guards, isolation rules, conventions
- **`memory-recovery.md`** — Session recovery workflow and state management

These three form the **governance layer** for all OpenCode sessions.

---

## Project Rules

**Source of truth:** `tech-stack.md` (at repo root).
Read `tech-stack.md` fully before planning or editing.
Stay in plan mode until approved, then switch to build.
## Swarm Installation & Verification

**Post-deployment checklist:**
- Run `opencode` + `/swarm diagnose`
- Verify `.opencode/swarm.json` is valid JSON
- Test MCP server connectivity
- Validate `events.jsonl` logging
- Run `/swarm council <test-question>`
- Check token costs
- Audit trail inspection
- Capacity test — run 5 parallel tasks
- Timeout tuning — set MCP timeouts
- Credential rotation plan

**Common installation failures:**
- Silent MCP timeout
- Credential scope issues
- Tool-call validation missing
- Agent initialization race

## Library Module: Planning Brief

**Core Concept:** Digital bookshelf; free in School mode, tokenized in Library mode.

**Data Flow:**
- Admin uploads e-books
- Booklist maps each child's course
- Library auto-populates Bookshelf
- Child accesses free or by token

**Next Session:** 5 LMS screens + 2–3 reader UI prototypes.

**Status:** Placeholder (LMS 71% done).

---

~~## Leadership Council (Above the Swarm)~~

> **OVERRIDDEN by ai-ops-plan §2, §4 — KILLED: L4 Leadership Council swarm replaced by single weekly Analyst pipeline. No agent-to-agent negotiation swarms.**

### Leadership Council (Historical Reference — Not Active)

> **Cross-reference:** Quick map + hard rules (roster approval, deferred items gate) are in AGENTS.md section 9. This file has the full detail. Both must be read at session start.

### Standard of Excellence
- Every lead operates at world-class level for their lane — highest known industry
  practices, no mediocrity.
- The Independent Consultant judges against the highest known industry standards
  current at the time of review, not internal convenience.
- The 17-agent swarm executes as sharply as the leads direct — precision, no drift,
  no hallucination.
- Anyone in the stack below standard is corrected or replaced.

### Hierarchy (top to bottom)
- **Cece** — Final authority. All approvals and escalations end here.
- **Independent Consultant** — Read-only oversight outside the swarm. Continuously
  researches whether the build follows the latest protocols and is on-trend,
  benchmarks against current industry standards, notes his own sources, makes
  suggestions, and flags issues to Cece in real time. Head of the monthly report
  compile. Does NOT run the build.
- **Orchestrator** — Execution layer. Routes work, convenes 2–3 relevant leads per
  phase, logs every decision in events.jsonl.
- **10 Leads** — COO, CTO, Backend, Frontend, Security, QA, DevOps, Data, Product
  Manager, Governance.
- **17-agent swarm** — Performs the build under the leads.

### Activation (gated)
- Leads are not always on. Orchestrator proposes 2–3 relevant leads per phase.
- Cece approves before any lead activates. No approval = no activation.

### Independent Consultant (continuous oversight)
- Works the whole time, not just monthly. Read-only — never builds.
- Continuously researches: are we following the latest protocols? Are we on-trend
  vs. current best-in-class?
- Notes his own sources and dates for every finding — no claim without a source.
- Makes suggestions and flags issues to Cece in real time as they arise, not only
  at month-end.
- Is the head who compiles the monthly report from all contributors' sections.
- Everything he raises — suggestions and flags — goes to Cece for sign-off.
- Logs his research, sources, suggestions, and flags to events.jsonl.

### Stay-Informed Loop (mandatory, fully tracked)
- The system keeps itself current; it does not rely on stale knowledge.
- Data Lead + Consultant continuously ingest current industry standards, trends,
  and best practices — each with source and date recorded.
- In-lane sharpening is double-gated and logged. No exceptions:
  1. The agent proposes a sharpening (what skill, what was learned).
  2. The agent records the exact source and date it came from.
  3. The Consultant vets it — source must be proven, current, not junk.
  4. Cece approves before it is adopted. No approval = no sharpening.
  5. Orchestrator logs the full entry to events.jsonl.
- Every sharpening entry must contain: agent, lane, what it sharpened, the source,
  the date, consultant verdict, Cece approval, timestamp.

### Tie-breaks
- First attempt in-lane: technical disputes → CTO; operational disputes → COO.
- If unresolved, the dispute goes UP to the Independent Consultant.
- The Consultant reviews and sends his verdict to Cece.
- Cece makes the final decision. The Consultant advises; Cece rules.
- Irreversible decisions go straight to Cece.

### Human-review triggers (mandatory)
- Legal / compliance matters
- Irreversible actions
- COO-vs-CTO standoff

### Cadence & Reviews
- Daily: 15-minute brief.
- Weekly: 1–2 hour deep-dive.
- Monthly: half-day strategic review + the combined leadership report (below),
  with human sign-off by Cece.
- Quarterly: self-assessment.

### Monthly Report (combined, multi-author)
- ONE document per month, compiled by the Consultant from all contributors.
- Each lead/agent writes their OWN section in their OWN expertise:
  - what they did this month
  - what they sharpened, with source + date
  - findings under their lane
  - suggestions tied to OUR build and the trends flagged this month
- The Consultant adds an independent section:
  - benchmark vs. current industry standards (dated, cited sources)
  - what changed in the industry this month and how it affects us
  - concerns and risks flagged for Cece
- Consultant combines every section + own audit into one report.
- All suggestions and flagged items go to Cece for sign-off — approved or rejected
  item by item. Nothing is adopted without Cece's approval.

### Audit
- events.jsonl is append-only; records each decision AND each sharpening, with the
  governing rule used.
- Every sharpening logs: what was learned, the source, the date, consultant vet,
  Cece approval.
- Logs are human-readable and AI-readable (human summaries + consultant logs).
- Consultant reads the log, judges against best practices, reports up to Cece.
- Nothing is adopted on unvetted or unsourced data.

### Session Handoff
- Leadership state (active leads, open approvals, pending sharpenings) is written to
  the session handoff on close, per the Memory & Session Workflow section.

