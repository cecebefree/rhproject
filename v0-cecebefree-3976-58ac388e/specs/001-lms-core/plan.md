# Implementation Plan: LMS Core

**Branch**: `001-lms-core` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `./spec.md`

## Summary

Core LMS functionality for Redhouse: students self-register, purchase course access, watch video chapters sequentially, and track progress; instructors create and manage courses with chapters; admins view all registrations and student progress. Implemented as a React web application with Supabase backend, using Row-Level Security for authorization and Supabase-generated TypeScript types.

## Technical Context

**Language/Version**: TypeScript 6.0.2

**Primary Dependencies**: React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.1, Supabase client (@supabase/supabase-js), React Router, React Hook Form, Zod validation

**Storage**: Supabase PostgreSQL with Row-Level Security (RLS). All data persisted via Supabase client in packages/shared. Time stored as timestamptz (UTC).

**Testing**: pgTAP (database policies), Vitest (unit/integration), Playwright (e2e). CI runs typecheck, lint, pgTAP, and build.

**Target Platform**: Web (Cloudflare Pages). Core flows accessible via browser. Mobile and Desktop surfaces not in scope for v1.

**Project Type**: Multi-page web application with authenticated user flows

**Performance Goals**: Support 1,000 concurrent students without video playback degradation (SC-008)

**Constraints**: 
- Sequential chapter unlocking cannot be bypassed
- All auth via Supabase Auth (email/password)
- Video hosting via third-party (Muvi per tech-stack.md)
- Payment processing via Stripe or similar gateway

**Scale/Scope**: 
- 3 user roles: Student, Instructor, Admin
- 20 functional requirements
- 8 core entities
- Single tenant (Redhouse) for v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Surface, Single Backend | ✅ PASS | Web surface uses shared Supabase backend via packages/shared |
| II. AI Isolation | ✅ PASS | LMS Core has zero AI components. No AI imports. |
| III. Tenant Isolation | ✅ PASS | Platform code imports from packages/shared only, not tenants/** |
| IV. Type Safety & Drift Prevention | ✅ PASS | Will use `supabase gen types` and commit to packages/shared/src/types/database.ts |
| V. RLS-First Security | ✅ PASS | All tables will have RLS policies. No application-layer auth bypass. |

**CI Hard Rules**:
- AI Import Guard: N/A (no AI in LMS Core)
- Platform/Tenant Import Guard: Will be verified - platform code must not import tenants/**
- Type Drift Guard: Will use committed generated types

## Project Structure

### Documentation (this feature)

```text
specs/001-lms-core/
├── plan.md              # This file
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (validation guide)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

Based on tech-stack.md structure:

```text
apps/
├── web/                  # React + Vite → Cloudflare Pages
│   └── src/
│       ├── features/     # Feature-based modules
│       │   └── lms/      # LMS Core feature module
│       │       ├── components/
│       │       ├── pages/
│       │       ├── hooks/
│       │       └── services/
│       └── routes/
├── mobile/              # Capacitor iOS (not in scope for v1)
└── lms/                 # Tauri desktop (not in scope for v1)

packages/
└── shared/              # Supabase client, RLS helpers, types
    └── src/
        ├── types/
        └── ...

supabase/
├── migrations/          # 001-012 exist, LMS Core adds 013-XXX
│   └── ...
└── functions/           # Edge Functions (not in scope for core LMS)
```

**Structure Decision**: 
LMS Core feature module at `apps/web/src/features/lms/` following tech-stack.md conventions. Shared Supabase utilities from `packages/shared/`. Database migrations in `supabase/migrations/`.

## Phase 0: Research

LMS Core does not have any NEEDS CLARIFICATION markers in the Technical Context. All decisions are determined by:
- Constitution constraints (TypeScript, Supabase, RLS-First)
- Project tech-stack (React 19, Vite, Tailwind CSS)
- Feature specifications (user stories, functional requirements)

No additional research required. Proceeding to Phase 1.

## Phase 1: Design

See generated artifacts:
- [research.md](./research.md) - N/A (no unknowns)
- [data-model.md](./data-model.md) - Entity definitions with Supabase schema
- [quickstart.md](./quickstart.md) - Validation scenarios for end-to-end testing