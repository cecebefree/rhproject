# DEFECT-002 — Unauthorized Board Renumbering

**Filed:** 2026-07-15
**Severity:** Process
**Status:** OPEN

---

## Description

The project has two board files with different numbering systems:

1. **Original board** (`master-todo-v2.md`): Items 1-48, Phases A-H
2. **Reconciled board** (`docs/governance/MASTER-TODO-V2.md`): Items 5-46, reorganized structure

The reconciled board was created on 2026-07-13 (commits `fd6422e`, `765b470`) and states:
> "Canonical source: mobile-phase-plan.md (items 5-14) + master-todo-v2.md (items 15+).
> This index is the single source of truth. Old Phase A-H numbering is
> superseded by this build list."

However, no Cece ruling authorized this renumbering. The original board was ratified on 2026-07-11 with the explicit note:
> "Changes require a DEFECT filing with evidence — no new review rounds."

## Impact

Numbering mismatches between boards, governance notes, and deferred register:

| Item | Governance Note | Original Board | Reconciled Board | Deferred Register |
|------|----------------|----------------|------------------|-------------------|
| Expo Port | ITEM-024 | Item 24 (post-fix) | Item 31 | Item 24 |
| Design Freeze | ITEM-009 | Item 32 | Item 9 | — |
| Field Register Guard | Item 13 | Item 13 | Item 15 | — |
| Chat Ruling | ITEM-001 | Item 1 | Item 1 | — |
| Certificates Ruling | ITEM-002 | Item 2 | Item 2 | — |

## Renumbering Origin

Git log reveals:
- `master-todo-v2.md`: Created at `1b9f9e5` (2026-07-11), modified at `43bb752` and `6efcbdd` (board corrections)
- `docs/governance/MASTER-TODO-V2.md`: Created at `fd6422e` (2026-07-13), modified at `765b470` (reconciliation)

The renumbering happened when the reconciled board was created on 2026-07-13 without a ruling. The original board Items 1-48 were mapped to a new numbering scheme (Items 5-46) in the reconciled board.

## Corrective Action

1. Log this defect (done)
2. Board numbering is now a ruled surface — changes require a Cece ruling
3. Until a ruling is issued, the original board (`master-todo-v2.md`) remains the authoritative source for Items 1-48
4. The reconciled board (`docs/governance/MASTER-TODO-V2.md`) is a reference document, not a replacement

## Root Cause

The reconciled board was created as a "canonical source" without recognizing that the original board numbering was already in use by governance notes and the deferred register. The assumption that "Old Phase A-H numbering is superseded" was incorrect — the numbering was actively referenced by other documents.

---

Filed by: Architect
Cece ruling required: YES — board numbering is now a ruled surface
