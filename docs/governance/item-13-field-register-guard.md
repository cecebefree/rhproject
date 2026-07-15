# Item 13 — Field Register Guard: CLOSED

**Status:** CLOSED
**Sealed:** 2026-07-15

## What shipped

`supabase/guard-field-register.sh` — parses `docs/field-register.md` as single source of truth, validates BACKED tables/columns against `information_schema.columns`. Exit 0 = pass, 1 = violation, 2 = connection error.

CI guard job runs against an ephemeral `postgres:17` service container. Migrations applied from `supabase/migrations/*.sql` in filename order. Supabase stubs (auth schema, roles, functions) created before migrations.

## Arc hashes

| Hash | Description |
|------|-------------|
| `996c7ca` | `feat(ci): register-driven guard-field-register.sh` |
| `d0a666d` | `docs: field-register.md — backfill 3 profiles columns` |
| `17809aa` | `ci: pass DATABASE_URL to guard job` |
| `e7ffc0d` | `fix(guard): fail loudly on connection error` |
| `684f380` | `ci: guard job runs against ephemeral Postgres service` |
| `2569bfe` | `ci: add Supabase stubs (auth schema, roles)` |
| `f36d753` | `ci: fix role creation — DO block with exception handling` |
| `cdeca3f` | `ci: quarantine guard-type-drift pending investigation` |

## Run evidence

| Run | Result | Guard step output |
|-----|--------|-------------------|
| `29396703325` (red-run) | Guard ✗ (exit 1) | `FAIL: public.profiles.fake_column - column missing from live schema` |
| `29396872512` (green-run) | Guard ✓ (exit 0) | `SUMMARY: 8 tables checked, 82 columns verified` / `PASS: field register matches live schema` |

## Quarantine: guard-type-drift.sh

**Ruling:** Quarantined. Explicitly commented out in `.github/workflows/ci.yml`. No `continue-on-error` masking.

**Root cause:** The guard connects to the ephemeral postgres but fails against it — likely requires additional Supabase stubs or has its own schema expectations. The original `FAIL: empty` was a swallowed psql auth failure (same root cause as field-register guard before the service-container fix).

**Re-enable condition:** Own investigation, own evidence trail, re-enable only by ruling.

## Open items

- `guard-type-drift.sh` — connects, fails against ephemeral schema. Needs investigation.
- `docs/field-register.md` status: FINAL
- `supabase/guard-field-register.sh` exit codes: 0 (pass), 1 (violation), 2 (connection error)
