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
