# ITEM-010 — Report Cards Relocated to School Front Desk

| Field | Value |
|-------|-------|
| **Status** | LOCKED — Cece confirmed 2026-08-11 |
| **Ruled by** | Cece |
| **Date** | 2026-08-11 |
| **Supersedes** | Row 41c (MASTER-TODO-V2.md) — reclassify report card entry from Office Desk to School Desk |

## Summary

Report cards are in-house academic communication to family/student/teacher.
They are NOT registration, payment, or invoicing. Therefore:

- **Report Cards move to School Front Desk** as a new section, alongside
  News, Groups broadcast, and direct chat.
- **Office Desk remains scoped strictly to:** manual/ad-hoc invoice creation,
  payment confirmation, and registration status changes
  (pending_init → pending_review → approved → active).
- **Report cards are explicitly out of Office Desk's scope.**

## Implementation Impact

### Files affected
- `apps/web/src/features/lms/pages/OfficeDeskPage.tsx` — remove ReportCardForm + ReportCardList
- `apps/web/src/features/lms/pages/SchoolDeskPage.tsx` — add ReportCardForm + ReportCardList as new section
- `apps/web/src/features/lms/components/ReportCardForm.tsx` — reroute to School Front Desk
- `apps/web/src/features/lms/components/ReportCardList.tsx` — reroute to School Front Desk
- `apps/web/src/main.tsx` — update routes

### RLS impact
- `rc_office_insert` (migration 088) — policy name may need update to reflect new desk role, or a new policy added for school-front-desk role
- `rc_office_select` (migration 052) — same consideration

### Row reference
- Row 67 in MASTER-TODO-V2.md (Move Report Cards from Office Desk to School Front Desk)

## Governance note

This ruling is part of the three-service-desk architecture lock
(row 50, MASTER-TODO-V2.md). Report cards are academic comms,
not business ops. Any reversal requires a new Cece ruling.
