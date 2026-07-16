# R-035 — Lint / Typecheck Baseline & Relay-Pattern v2 Doctrine

Sealed by operator ruling R-035 REMEDIATION + R-035 SEAL. Scope of this
round: exactly one config edit (Biome exemption) plus this baseline doc.
No fixes to mobile, no tsconfig authoring, no v0 directory changes.

## Baseline of record

### Lint (`pnpm --dir <repo> exec turbo run lint --force --continue`)
- `@rhproject/web`: **0 errors** (1 file checked, clean).
- `@redhouse/shared`: **0 errors** after F1 exemption (was 1 format error on `database.types.ts`; 3 files checked post-exempt).
- `@redhouse/mobile`: **33 errors** (38 files checked). Biome caps diagnostic
  display at 20 per file group ("Diagnostics not shown: 13"), so the true
  count is 33, not the truncated view. Errors are `format` and
  `organizeImports` across `app/(tabs)/*.tsx`, `src/theme/colors.ts`,
  `src/components/EmptyState.tsx`, and `package.json`. All auto-fixable via
  `biome check --write` / `--fix --unsafe`; intentionally untouched this round.
- Aggregate: web 0 + shared 0 + mobile 33 = **34 graph-wide**, accepted state
  for this round is exit 1 solely due to mobile.

### Typecheck (`pnpm --dir <repo> exec turbo run typecheck --force`)
- `@rhproject/web`: **unmeasurable** — no `tsconfig.json`; `tsc --noEmit`
  prints the `--help` wall and exits 1. 0 real TS error codes emitted.
- `@redhouse/shared`: **unmeasurable** — no `tsconfig.json`; same `--help`
  exit-1 behavior. 0 real TS error codes emitted.
- `@redhouse/mobile`: has `apps/mobile/tsconfig.json` but its `typecheck`
  script is blocked by a `pnpm install` failure when invoked from a subdir
  (see F3 downgrade). No TS errors surfaced.
- **0 TS error codes (TS2xxx etc.) emitted anywhere** — every typecheck
  failure is a config/infra absence, not a type error. A true type-error
  baseline cannot be established until tsconfigs exist (see Open items).
- Evidence that tsconfigs never existed: `git log --follow -- packages/shared/tsconfig.json`
  and `git log --follow -- apps/web/tsconfig.json` both return empty (exit 0).

## F1 resolution — `database.types.ts` Biome exemption

`biome.json` `files.ignore` gained the entry:

    "**/database.types.ts"

This exempts the supabase-generated type snapshot from Biome formatting/lint.

**Rationale for the broad glob:** `database.types.ts` is reserved by project
convention for `supabase gen types` output (canonical path fixed in P2-001).
The package-relative form `"packages/shared/src/database.types.ts"` was
tested first and **does NOT match** when `biome check .` runs inside
`packages/shared` — Biome resolves `files.ignore` globs against the path as
seen from the package's working directory, so the root-relative path misses.
The `**/` glob matches from any base and was verified: `biome check .` in
`packages/shared` → "Checked 3 files. No fixes applied." (exit 0).
**Do not narrow this glob to the package-relative form without re-testing
from the sub-package CWD.**

## Guard-interaction record

`scripts/ci/guard-type-drift.sh` (reactivated earlier this engagement)
performs a **raw byte `diff`** of `packages/shared/src/database.types.ts`
against `supabase gen types typescript --db-url "$DATABASE_URL" --schema public`
output, pinned to supabase CLI 2.108.0. No normalization — whitespace, line
breaks, and quote style all matter. The CLI emits multi-line, double-quoted
object literals; Biome wants single-line, single-quoted. Therefore
**formatting the snapshot (`biome format`) would make the committed file fail
the guard** ("types drifted"). Exempting the file from Biome (F1) is the only
guard-safe fix — it removes the lint error without altering file contents, so
the byte-diff guard is unaffected. Note the guard requires `DATABASE_URL`
set, else it exits 1 with "type generation failed" (fail-loud by design).

## F3 downgrade

The earlier `@redhouse/mobile` `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
@redhouse/shared` was a **subdir-invocation artifact**: running `pnpm`
inside `apps/mobile/` resolved a narrower workspace root and could not see
sibling packages. `pnpm-workspace.yaml` was verified correct — its globs
`apps/*` and `packages/*` cover all three packages (`@rhproject/web`,
`@redhouse/shared`, `@redhouse/mobile`). No workspace-config defect exists.
Recorded as a finding only; no config change.

## Doctrine (new, established this round)

a) **Turbo cache is not evidence.** Verification runs use `--force`; a cache
   hit reporting "clean" proves nothing about current source state.
b) **Full-graph inventory requires `--continue`.** Mobile's 33 lint errors
   were invisible to every prior halt-on-failure (`--force` without
   `--continue`) run, which stopped after the first failing package.
c) **Relay-pattern v2:** stage → `diff` (sanity) → `cp` → `git diff`
   (byte-proof) → **BEHAVIORAL VERIFY** (run the affected tool, observe its
   exit code / diagnostics). A byte-identical `git diff` does NOT prove the
   config change has the intended effect — only running the tool does. The
   first F1 relay passed the byte check yet failed lint; the behavioral gate
   caught it.
d) **Absolute-anchor rule.** Never rely on shell `pwd`. Use
   `git -C <abs>` / `pnpm --dir <abs>` with absolute paths for every repo
   operation. The first verify attempt failed because `pnpm turbo` ran from
   the staging dir's CWD (turbo not found) — proof that pwd cannot be trusted.

## Open items carried forward

- **ITEM-A — tsconfig authoring (shared + web).** Author `tsconfig.json` for
  `packages/shared` and `apps/web` to unlock the first true type-error
  baseline. Currently unmeasurable. New ITEM, separate ruled round.
- **ITEM-B — v0 quarantine breach (elevated).** `v0-cecebefree-3976-58ac388e`
  has **82 tracked files** (`git ls-files` count = 82) and is **not** ignored
  by git (`git check-ignore -v` exit 1; only Biome's `files.ignore` lists it,
  which is irrelevant to git). Breach of the quarantine doctrine. New ITEM,
  separate ruled round (git-untrack / add to `.gitignore`). Do not modify the
  v0 directory contents this round.
- **ITEM-C — mobile 33 lint errors.** Bulk `biome --write` (or
  `--fix --unsafe` for import sorting) across `app/(tabs)/*.tsx`,
  `src/theme/colors.ts`, `src/components/EmptyState.tsx`, `package.json`.
  Own ruled pass; intentionally not done this round.
