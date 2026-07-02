# SESSION PLAN: S2 Monorepo Scaffold + Migration 019

**Status:** READY — awaiting Cece's OK-to-build
**Created:** 2026-07-10
**Authority:** Cece (final OK-to-build)
**Swarm:** default (coder + reviewer confirmed working)

---

## CONTEXT
- Backup complete (folder copy done)
- Local DB confirmed empty (not running)
- Root `package.json` already exists and is CORRECT (pnpm@11.9.0, turbo 2.10.1, biome, typescript)
- Only Step 4 is irreversible

---

## SESSION A — SCAFFOLD (Steps 1–3)

**Deliverable:** Installable, typechecking monorepo.

### Step 1 [coder]: Create 7 NEW scaffold files
**Layout Option A:** `apps/web`, `apps/mobile`, `apps/lms`, `packages/shared`

| # | File | Purpose |
|---|------|---------|
| 1 | `pnpm-workspace.yaml` | Workspace definition |
| 2 | `turbo.json` | Turborepo task config |
| 3 | `biome.json` | Lint/format config |
| 4 | `packages/shared/package.json` | Shared package manifest |
| 5 | `apps/web/package.json` | Web app manifest |
| 6 | `apps/mobile/package.json` | Mobile app manifest |
| 7 | `apps/lms/package.json` | LMS app manifest |

**NOT touching:**
- `package.json` (root) — exists, CORRECT, keep as-is
- `packages/shared/src/types/database.ts` — S3 work, not scaffold

**Done-when:** 7 new files exist at correct paths; root `package.json` untouched; final state = 8 files on disk total.

**Compliance:** Reviewer delegation MANDATORY for this coder task.

---

### Step 2 [DevOps]: Install dependencies
**Action:** Run `pnpm install` at repo root

**Done-when:** Exit code 0; `node_modules/.pnpm` created; no peer dep warnings.

---

### Step 3 [DevOps]: Typecheck
**Action:** Run `pnpm typecheck` (delegates to `turbo run typecheck`)

**Done-when:** Exit code 0; no TS errors.

---

**STOP after Step 3. Report to Cece. Wait for confirm before Session B.**

---

## SESSION B — MIGRATION 019 (Steps 4–9)

**Deliverable:** Tenant tables live and verified.

### Step 4 [USER — IRREVERSIBLE]: Apply migrations
**Action:** User runs `supabase db reset` (applies 013–019)

**Done-when:** "Applied 019_tenants.sql"; `supabase status` shows DB healthy.

**IRREVERSIBLE:** Drops and recreates database.

---

### Step 5 [DevOps]: Verify tables exist
**Action:** `psql -c "\dt public.tenants public.tenant_mobile"`

**Done-when:** Both tables listed; columns match spec.

---

### Step 6 [DevOps]: Verify RLS enabled
**Action:** `psql -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('tenants','tenant_mobile')"`

**Done-when:** Both show `relrowsecurity = t`.

---

### Step 7 [DevOps]: Verify indexes
**Action:** `psql -c "\di idx_tenants_*"`

**Done-when:** `idx_tenants_kind` and `idx_tenants_slug_active` present.

---

### Step 8 [DevOps]: Lint
**Action:** Run `pnpm lint` (delegates to `turbo run lint`)

**Done-when:** Exit code 0.

---

### Step 9 [DevOps]: Test
**Action:** Run `pnpm test` (delegates to `supabase db test`)

**Done-when:** Exit code 0.

---

**STOP after Step 9. Report to Cece.**

---

## COMPLIANCE RULES

| Rule | Status |
|------|--------|
| One step at a time | Enforced |
| Report after each step | Enforced |
| Fix errors in-session | No skipping failing steps |
| Step 4 executed by Cece | Not swarm |
| Hard stop at 90 minutes | Pause and report if exceeded |
| Reviewer delegation mandatory (Step 1) | Stage A + Stage B required |
| pre_check_batch NOT a substitute for reviewer | Agent review required |
| Root package.json untouched | Already correct |

---

## ESTIMATED TIME

| Session | Steps | Time |
|---------|-------|------|
| A (Scaffold) | 1-3 | ~10 min |
| B (Migration) | 4-9 | ~8 min |
| **Total** | 1-9 | **~18 min** |

---

## FILES ON DISK (final state after Step 1)

| File | Status |
|------|--------|
| `package.json` | EXISTS (keep) |
| `pnpm-workspace.yaml` | CREATE |
| `turbo.json` | CREATE |
| `biome.json` | CREATE |
| `packages/shared/package.json` | CREATE |
| `apps/web/package.json` | CREATE |
| `apps/mobile/package.json` | CREATE |
| `apps/lms/package.json` | CREATE |

**Total: 8 files** (1 existing + 7 new)

---

**AWAITING CECE'S OK-TO-BUILD. NO WORK WILL BEGIN UNTIL CONFIRMED.**

---

=== PLAN CLOSED ===
Plan: S2 Monorepo Scaffold + Migration 019
Completed: 2026-07-02
Verified against build by: Backend Lead, Security Lead, DevOps Lead
Result: All 9 steps complete. Migrations through 025, RLS active,
        indexes verified (D13 ACCEPT), lint clean.
Sign-off: Leadership Council — APPROVED COMPLETE
=== END ===

