# Best Practices — vas-edutech (Redhouse)

> Read `tech-stack.md` fully before planning or editing. This file supplements it with day-to-day development conventions.

---

## 1. AI Isolation

- **Only** `apps/lms/src/ai/` may contain AI code (engine, RAG, tutor assembly)
- `apps/web` has **zero** AI imports — enforced by CI guard
- `apps/mobile` has **one** AI screen (AI Tutor) that calls `ai-tutor-proxy` Edge Function only
- No AI SDKs (openai, anthropic, @langchain, etc.) in `apps/web/**` or `apps/mobile/**`
- Edge Functions route all AI calls; browser never calls AI providers directly

## 2. CI Hard Rules (Non-Negotiable)

| Guard | What it blocks |
|-------|----------------|
| **AI-import guard** | `apps/web/**` or `apps/mobile/**` importing `apps/lms/src/ai/**` or any AI SDK |
| **Platform/tenant guard** | `apps/lms/**` or `apps/mobile/**` (engine code) importing `tenants/**` |
| **Type-drift guard** | `supabase gen types` output differing from committed `packages/shared/src/types/database.ts` |

All three fail the build. Do not bypass.

## 3. Tenant Isolation

- Every row in every LMS/mobile table must be `tenant_id` scoped
- Web tables use role-only RLS
- Run `make test` (pgTAP) to verify isolation before pushing
- Zero cross-tenant data leakage — pgTAP `test_tenant_isolation.sql` enforces this

## 4. Supabase Types

```bash
# Regenerate after any migration
make types

# Or directly:
supabase gen types typescript --local > packages/shared/src/types/database.ts
```

- Types are committed — CI will fail on drift
- Never manually edit `packages/shared/src/types/database.ts`

## 5. Time & Scheduling

- Store all instants as `timestamptz` (UTC)
- Convert to local **only** at display layer
- pg_cron schedules in **UTC** — compute per-region target times
- Make handlers **idempotent** (handles DST transitions)
- Store `user.timezone` (IANA name) in profile

## 6. Secrets

- `SUPABASE_SERVICE_ROLE_KEY` is **Edge Functions only** — never in client bundles, never committed
- All secrets git-ignored via `.env`
- CI scans for secret patterns — never commit keys or tokens

## 7. Linting & Type Checking

```bash
make lint    # Biome
make typecheck  # TypeScript
```

- Biome replaces ESLint — do not add new ESLint configs
- `noImplicitAny: true` enforced in `tsconfig.base.json`
- Fix lint/type errors before pushing

## 8. Git Conventions

- Commit message format: short subject line, blank line, description if needed
- Keep commits focused — one logical change per commit
- Never commit generated files unless explicitly required (e.g., `database.ts`)
- Branch naming: `feature/`, `fix/`, `chore/` prefixes

## 9. React 19 Conventions

- Use **concurrent features** appropriately (Suspense, useTransition, etc.)
- Prefer **server components** where applicable
- No `any` type — use `unknown` and narrow appropriately
- Co-locate component styles with components when using Tailwind (no separate CSS files unless necessary)

## 10. Monorepo Structure

- Apps live in `apps/` (web, mobile, lms)
- Shared code in `packages/shared/`
- Tenant configs in `tenants/` — pure config only, no platform logic
- Edge Functions in `supabase/functions/`
- Migrations in `supabase/migrations/`

## 11. Edge Function Development

- All 6 functions run in Supabase Edge Runtime
- Use Deno compatibility mode
- Return typed JSON responses
- Validate all inputs server-side — client validation is UX only
- Turnstile verification on all write operations

## 12. RLS Policy Pattern

```sql
-- LMS/Mobile tables: role + tenant_id
CREATE POLICY "Users see own tenant" ON table_name
  FOR ALL USING (
    auth.jwt() ->> 'tenant_id' = tenant_id
    AND auth.jwt() ->> 'role' IN ('student', 'parent', 'teacher', 'admin')
  );

-- Web tables: role only
CREATE POLICY "Role-based access" ON web_table
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

## 13. Naming Conventions

| Thing | Convention | Example |
|-------|------------|---------|
| Database tables | `snake_case` plural | `student_profiles` |
| Columns | `snake_case` | `created_at` |
| React components | `PascalCase` | `BookShelfCard` |
| Hooks | `camelCase` with `use` prefix | `useAuth` |
| Edge Functions | `kebab-case` | `ai-tutor-proxy` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `SUPABASE_URL` |
| TypeScript types/interfaces | `PascalCase` | `TenantConfig` |

## 14. Error Handling

- Edge Functions: return typed error responses `{ error: string, code: string }`
- React: use error boundaries for component failures
- Never expose internal error details to client in production
- Log errors server-side with sufficient context for debugging

## 15. Accessibility (WCAG AA)

- All surfaces must meet AA contrast ratios
- Keyboard navigation for all interactive elements
- Proper ARIA labels and roles
- Focus management in modals and dynamic content
- Run accessibility audits before shipping new features

---

## Quick Reference

```bash
make setup      # Full bootstrap
make types      # Regenerate Supabase types
make lint       # Biome check
make typecheck  # TypeScript check
make test       # pgTAP tests
make dev        # Start all dev servers
make build:all  # Build all apps
```