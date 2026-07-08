# Triage — Full Picture Findings

## True drift (must fix)
- DUPLICATE MIGRATION 021 — RESOLVED: renamed 021_student_class.sql -> 027_student_class.sql (git mv). Was hard-blocking db diff via schema_migrations_pkey collision.

## Intentional deferral (leave by rule)
- 023 missing = reserved per D12 (commit e2b3f88). NOT drift.

## Not-yet-built / sequencing (fix order, not schema)
- (fill after clean db diff completes)
