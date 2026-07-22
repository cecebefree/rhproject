# R27-SCOPE — Row 27 Close-Out: R18 Hybrid Live Write→Release Cycle

**Documents:** BUILD-R16-R18-demo-scope.md (R18: lines 20-24)
**Status:** Owner-approved 2026-07-22
**Approach:** A1 — local SQL RPCs (shim, replaced by EFs post-deploy)

---

## Context

R18 demands a hybrid: one seeded released card (DONE at commit 637b56c)
plus **one LIVE write→release cycle** in the walkthrough:
  teacher drafts → office desk releases → released-only visibility

The seeded card (Mathematics, visible, student1) exists in seed.sql.
The missing half is the live cycle — the RPC pipeline and the
walkthrough that exercises it.

---

## Remaining Work

### A. Teacher Write (Draft) — `create_draft_report_card` RPC

Creates a report_card row with status='draft'. The existing
`rc_teacher_insert` RLS policy already gates on role='teacher' and
created_by = auth.uid(). The RPC wraps this for demo convenience.

- Student_id, term, subject, grade as parameters
- Sets created_by = auth.uid()
- Returns the created row

### B. Office Desk Release — `release_report_card` RPC

Transitions report_card.status from 'draft' to 'visible' in **one
transaction**:

- Sets status = 'visible'
- Sets released_at = now()
- Sets released_by = auth.uid()
- DO NOT drop the timestamp (released_at is the audit record)

**Role enforcement:** Rejects caller whose profile.role != 'office'
even as a local shim (per ITEM-004 §2 — only Office Desk writes
status columns).

### C. Released-Only Visibility

The existing `rc_learner_select_visible` RLS policy already filters
to student_id = auth.uid() AND status = 'visible'. The release RPC
lands on 'visible' directly (skips transient 'released' split).

### D. Walkthrough Script

A step-by-step demo script stored at docs/planning/r18-walkthrough.md
recording the terminal commands / mobile taps.

---

## Follow-Up Row

Register a new board row after row 27 completes:

| # | Item | Blocked By |
|---|------|------------|
| 27b | Swap R18 RPCs → Edge Functions (replace local shim RPCs with fully wired EFs) | 22 (EF scaffold), 28 (Office Desk EFs) |

---

## Acceptance Criteria

Row 27 transitions from PARTIAL to DONE when:

- [ ] `create_draft_report_card` RPC creates a draft card for a teacher caller
- [ ] `release_report_card` RPC transitions draft → visible in one transaction,
      stamps released_at = now(), sets released_by = auth.uid()
- [ ] Released card appears in learner's report-card screen after
      refresh (filtered to visible per R18)
- [ ] DRAFT card is NOT visible to student1/guardian before release
      (adversarial check: query as learner role, expect zero rows)
- [ ] Release RPC rejects caller without Office Desk role
      (adversarial check: call as teacher1, expect error)
- [ ] Walkthrough script exists and can be followed start-to-finish
