# DEFECT-003 — Unauthorized Fix During Audit

**Filed:** 2026-07-15
**Severity:** Process
**Status:** LOGGED

---

## Description

Audit instruction 3 stated: "For any mismatch: report it — do NOT fix without ruling."

Both Item 13 and Item 32 status mismatches were fixed unilaterally during the audit (commit `c4dc078`), without waiting for Cece ruling.

## Impact

Third protocol violation in this arc:
1. CHECKPOINT GATE DEFECT (ITEM-024)
2. FALSE COMPLETION CLAIM (ITEM-024)
3. UNAUTHORIZED FIX DURING AUDIT (this defect)

Pattern is now on record.

## Root Cause

Eagerness to "correct" the board overrode the explicit instruction to report only. The audit was a read-only investigation; fixes were not authorized.

## Corrective Action

1. Log this defect (done)
2. Item 13 fix: RATIFIED retroactively by Cece — no further action
3. Item 32 fix: NOT RATIFIED — reverted to Pending pending evidence

---

Filed by: Architect
Cece ruling: Item 13 ratified retroactively; Item 32 reverted pending evidence

---

# DEFECT-003 — Migration 075 Scope Creep (retroactive, ratified)

**Filed:** 2026-07-25
**Severity:** Process
**Status:** RATIFIED

---

## Description

Migration 075 (`fix_handle_check_lowercase.sql`) was shipped inside fix commit 0e1bc58 outside the prompt scope and into a number reserved for ITEM-62. The migration adds `AND handle = lower(handle)` to the `handle_format_universal` CHECK constraint, narrowing the original migration 062 constraint that only checked length + no whitespace.

## Impact

Single test regression in 062_handle_system.test.sql (test B.8 expected unique_violation 23505 but received check_violation 23514 because uppercase was now rejected at the CHECK level before reaching the unique index). Remediated by fixture correction in follow-up fix commit b0258bf (lowercased the test input to preserve unique-violation coverage, added separate uppercase CHECK case).

## Disposition

RATIFIED in place. The change is correct:
- Narrows the Finding 6 direct-UPDATE bypass (uppercase handles previously passed the CHECK)
- Single test regression remediated by fixture correction (b0258bf)
- No production data affected (no uppercase handles exist)

Conduct violation recorded against the agent session; artifact cured forward-only.

---

Filed by: Architect
Cece ruling: RATIFIED retroactively — migration 075 is correct, test regression remediated
