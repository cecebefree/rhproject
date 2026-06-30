# vas-edutech (Redhouse) Constitution

## Core Principles

### I. Multi-Surface, Single Backend
Three surfaces (Web, Mobile, LMS) share one authoritative Supabase backend via `packages/shared`. The Web app (`apps/web`) is the marketing site; Mobile (`apps/mobile`) is Capacitor iOS; LMS (`apps/lms`) is Tauri desktop with AI isolated in `apps/lms/src/ai/`. No surface owns data logic—Supabase (RLS, Edge Functions, pgTAP) is the single source of truth.

### II. AI Isolation (NON-NEGOTIABLE)
AI code lives **exclusively** in `apps/lms/src/ai/` (engine, RAG, tutor assembly). The Web app has **zero** AI imports. The Mobile app has **exactly one** AI screen (AI Tutor) that calls the `ai-tutor-proxy` Edge Function. CI Guard 1 fails any `apps/web/**` or `apps/mobile/**` import from `apps/lms/src/ai/**` or any AI SDK (`openai`, `anthropic`, `@langchain/*`, etc.).

### III. Tenant Isolation (Platform / Tenant Separation)
Platform code (`apps/lms/**`, `apps/mobile/**`, `packages/shared/**`) **must not** import from `tenants/**`. Tenants (`tenants/redhouse/`, `tenants/_template/`) are pure configuration (branding, feature flags, content). CI Guard 2 fails any engine-code import from `tenants/**`. New tenants are created by copying `_template/`.

### IV. Type Safety & Drift Prevention (NON-NEGOTIABLE)
Supabase-generated TypeScript types (`supabase gen types typescript --local`) are committed to `packages/shared/src/types/database.ts`. CI Guard 3 fails the build if `supabase gen types` output differs from the committed file. Run `make types` to regenerate; commit the diff. No manual edits to generated types.

### V. RLS-First Security (NON-NEGOTIABLE)
Row-Level Security is the **sole** authorization layer. Web tables = role-only policies. LMS/Mobile tables = role + `tenant_id` policies. All policies are verified by pgTAP tests in `supabase/tests/` (run via `make test`). No application-layer authorization bypasses RLS. `SUPABASE_SERVICE_ROLE_KEY` is Edge-Function-only (server-only, bypasses RLS), never shipped to clients.

## Architecture Constraints

### CI Hard Rules (Three Guards — Hard Failures)
1. **AI Import Guard** — Fails if `apps/web/**` or `apps/mobile/**` import from `apps/lms/src/ai/**` or any AI SDK.
2. **Platform/Tenant Import Guard** — Fails if `apps/lms/**` or `apps/mobile/**` import from `tenants/**`.
3. **Type Drift Guard** — Fails if `supabase gen types` output diffs vs committed `packages/shared/src/types/database.ts`.

### Platform / Tenant Boundary
`apps/lms/**` and `apps/mobile/**` are platform code. They import from `packages/shared/**` only. `tenants/**` is data-only (JSON/TS config, no executable logic imported by platform). New tenants copy `tenants/_template/`.

### AI Module Boundary
Only `apps/lms/src/ai/` contains AI logic (engine, RAG, tutor assembly). Mobile AI Tutor screen calls `ai-tutor-proxy` Edge Function (server-side AI). Web has zero AI imports. Edge Functions (6 total): `verify-turnstile`, `nightly-reconciliation`, `hubspot-webhook`, `class-start-ping`, `validate-toggle`, `ai-tutor-proxy`.

### Supabase Authority
Supabase is the **authoritative** data store. HubSpot is sync-only (outbound: Supabase → HubSpot via nightly reconciliation + webhook). Time: all instants stored as `timestamptz` (UTC); convert to local ONLY on display. pg_cron runs in UTC; schedule in UTC. DST handled by idempotent handlers.

## Development Workflow

### Plan Mode → Build Mode
All work starts in **Plan Mode**: read `tech-stack.md`, investigate, propose plan, **stop for approval**. Only after explicit approval switch to **Build Mode** (execute approved plan). Never commit without approval.

### Make Targets (Source of Truth for Commands)
- `make setup` — Local bootstrap (Docker, Supabase, types, deps)
- `make types` — Regenerate Supabase types → `packages/shared/src/types/database.ts`
- `make dev` — Start all dev servers
- `make build:all` — Build all apps
- `make test` — Run pgTAP tests
- `make lint` — Biome lint
- `make typecheck` — TypeScript typecheck

### CI Gates
All PRs must pass: TypeScript typecheck, Biome lint, `make test` (pgTAP), `make build:all`, and the **three CI Hard Rules** above. No exceptions.

## Governance

This constitution supersedes all other practices. Amendments require: (1) documented rationale, (2) approval, (3) migration plan for affected code. All PRs/reviews must verify compliance. Complexity must be justified. Use `tech-stack.md` as runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-26

<!-- Sync Impact Report
Version change: (template) → 1.0.0
Modified principles: All 5 placeholders filled with project-specific principles
Added sections: Architecture Constraints (CI Hard Rules, Platform/Tenant Boundary, AI Module Boundary, Supabase Authority), Development Workflow (Plan/Build modes, Make targets, CI Gates)
Removed sections: None (template placeholders only)
Templates requiring updates:
- .specify/templates/plan-template.md: ✅ align plan-mode gates
- .specify/templates/spec-template.md: ✅ align scope/requirements
- .specify/templates/tasks-template.md: ✅ align task categories
- .specify/templates/commands/*.md: ⚠ pending review for agent-specific references
Follow-up TODOs: RATIFICATION_DATE needs historical date; command template audit pending
-->