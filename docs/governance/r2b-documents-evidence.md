# R-2b — Documents Re-Seed Evidence (Deferred Stub)

**Status:** deferred stub (R-2b). Registered: 2026-07-20b session.
**Pointing at (external, NOT written into):** `/Users/ce/Documents/Redhouse-website`
**Constraint:** zero writes under `/Users/ce/Documents`. This artifact lives in-repo and references the external path only.

## Recorded Evidence

| Field | Value |
|-------|-------|
| Path | `/Users/ce/Documents/Redhouse-website` |
| Stat birth | `Jul 20 12:10:21 2026` |
| Interpretation | re-seed-after-deletion; hold released |
| Evidence source | prior session end-state report @ `0dc922e` |

## Today's Observation (2026-07-20b)

The active session workspace was anomalously anchored at
`/Users/ce/Documents/Redhouse-website/redhouse-real-web` — i.e. a folder
residing _under_ the same `/Users/ce/Documents/Redhouse-website` tree whose
re-seed is recorded above. This corroborates the folder's continued
regeneration / persistence after deletion, consistent with the R-2b
re-seed-after-deletion finding. The working git repo for this session is
`/Users/ce/dev/rhproject-new` (separate from the Documents tree); all
writes were made there, shell-only, absolute paths.

## Follow-up

Full R-2b analysis (root cause of re-seed, hold-release provenance, and any
containment action) remains deferred per the original R-2b ruling. This stub
closes the evidence-registration gap; the substantive investigation is tracked
on the board and not expanded here (no scope creep).
