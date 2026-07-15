# ITEM-004 — d64bb05 (Front-Desk Registration Pipeline)

| Field | Value |
|-------|-------|
| **Commit** | `d64bb05079cab9b9796311a4ef074001bc6c48ee` |
| **Spec file** | `docs/spec/front-desk-registration.md` |
| **Status** | RULED — registration pipeline spec carried forward into mobile phase plan |
| **Ruled by** | Cece |
| **Date** | 2026-07-11 |

## Summary

Front-desk registration pipeline spec. Describes the onboarding flow:
tenant creation, staff provisioning, course/track setup, student
enrollment — end-to-end registration sequence for the Redhouse admin
console.

## Ruling

Spec is RULED — content carried forward into the mobile phase plan
(commit `3cfcab8`). No separate implementation track; registration
pipeline is consumed by Items 5–8 (v0 screen design) as the canonical
data model reference.

## Governance note

This spec was created in isolation (no spec_review / council review).
Valid as Cece-authored directive. If downstream implementation diverges
from spec content, a new ruling is needed before merge.
