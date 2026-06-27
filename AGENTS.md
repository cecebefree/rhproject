# AGENTS.md — redhouse-real-web

**READ tech-stack.md FIRST** — it describes the target architecture, not the current state.

---

## Current State: Mid-Migration

Single Vite + React 19 app at repo root. Migration to pnpm + Turborepo monorepo is **in progress but not complete**.

Actual structure:
```
repo root/           # Vite app (redhouse-temp)
├── src/             # Current working app (App.tsx, components/, pages/, hooks/)
├── apps/web/src/    # New LMS feature code being scaffolded (features/lms/)
├── supabase/migrations/  # 6 migrations (013–018), LMS schema in progress
├── package.json     # Has workspaces config (apps/*, packages/*) but structure incomplete
└── dist/            # Built output
```

**What's done vs planned:**
- `apps/web/` scaffold exists but is not the active app — `src/` at root is
- `supabase/migrations/013-018` exist (LMS tables: users_profiles, courses, chapters, enrollments, chapter_progress)
- `packages/`, `tenants/`, `supabase/functions/`, `Makefile`, `biome.json`, `turbo.json` do NOT exist yet

---

## Development Commands

```bash
# Current working app (root)
npm run dev      # Vite dev server
npm run build    # Build root app → dist/

# Supabase (when local dev is set up)
supabase start
supabase status

# No make targets exist yet (Makefile is TODO)
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Root app entry |
| `src/pages/` | Page components |
| `src/components/` | Shared components |
| `src/hooks/` | Custom React hooks |
| `src/utils/` | Utility functions |
| `src/types/` | TypeScript types |
| `apps/web/src/features/lms/` | New LMS feature (being built) |
| `supabase/migrations/013-018` | LMS database schema |
| `tech-stack.md` | Target architecture blueprint |

---

## tech-stack.md Notes

`tech-stack.md` describes the **target monorepo** state, not current reality:
- `pnpm`, `Turborepo`, `Biome`, `Makefile` targets are TODO
- Apps (`apps/web`, `apps/mobile`, `apps/lms`) are TODO
- `packages/shared` is TODO
- Edge Functions (6) are TODO
- pgTAP tests are TODO
- CI guards (AI-import, platform/tenant) are TODO

---

## Active Work Context

The `specs/001-lms-core/` directory contains the LMS feature spec and plan being implemented:
- `specs/001-lms-core/plan.md` — implementation plan
- `specs/001-lms-core/tasks.md` — task list
- LMS pages in `apps/web/src/features/lms/pages/`
- LMS services in `apps/web/src/features/lms/services/`
- LMS components in `apps/web/src/features/lms/components/`

---

## Workflow

1. Read `tech-stack.md` for target architecture
2. Read `specs/001-lms-core/plan.md` for current implementation plan
3. Ask before making changes to core architecture (the migration plan is not finalized)

---

## Gotchas

- Root `src/` is the active app; `apps/web/` is being scaffolded — don't assume code there is complete
- No CI guards exist yet (the AI-import guard, platform/tenant guard, type-drift guard are all TODO)
- ESLint (not Biome) is currently used
- `SUPABASE_SERVICE_ROLE_KEY` handling follows what tech-stack.md describes but no Edge Functions exist yet
- This is a migration-in-progress repo; verify existence of files/dirs before assuming they're implemented