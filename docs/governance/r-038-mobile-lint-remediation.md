# R-038 — Mobile Lint Remediation

## Context
R-035 deferred mobile lint cleanup. This ruling remediates mobile's mechanical
lint errors with Biome safe fixes only, closing the R-035 deferral and bringing
the lint+typecheck floor to zero across shared / web / mobile.

## Method
- npx biome check --write . (safe fixes only)
- No --unsafe, no biome.json edits
- packages/shared (generated database.types.ts) untouched
- No v0-cecebefree-* paths touched

## BEFORE (Phase 1 — re-measure, read-only)
33 errors:

| Rule                       | Count |
| -------------------------- | ----- |
| organizeImports            | 18    |
| format                     | 12    |
| lint/style/useImportType   | 3     |
| Total                      | 33    |

## Write pass (Phase 2)
npx biome check --write . — safe fixes only.
Result: Checked 38 files. Fixed 21 files. (WRITE_EXIT=0)

## AFTER (Phase 3 — verify)
npx biome check . -> Checked 38 files. No fixes applied. (AFTER_EXIT=0)
Residual errors: none.

## Regression sweep (Phase 4)
- npx tsc --noEmit in apps/mobile -> MOBILE_TSC=0 (R-037 baseline holds)
- git diff --stat -> 21 files, all under apps/mobile/. No paths outside
  apps/mobile modified. packages/shared and v0-cecebefree-* untouched.

## Arc note
Closes the R-035 lint deferral. Lint+typecheck floor is now zero across
shared / web / mobile.

## Incident: write-tool workspace mis-anchoring

- The agent native write tool resolved relative paths against a stale root
    /Users/ce/Documents/Redhouse-website/redhouse-real-web (a neutered duplicate
  repo that must never be used).
- Shell operations using absolute paths were unaffected. Only the native write
  tool drifted. The R19 five-point anchor check (all shell/git based) CANNOT
  detect this class of mis-anchoring.
- A stray, uncommitted copy of this governance doc was created in the wrong repo
  by the write tool. It is flagged for manual deletion by the operator; the wrong
  repo received NO commits from this session.
- Remediation: R19 anchor protocol amended from five points to six (write-probe
  added). Future sessions must be relaunched and re-anchored from
    before any write-tool use.
