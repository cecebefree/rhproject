# ITEM-012 — MVP Scope Decisions: Pending-Payment Timeout + Desk Permissions

| Field | Value |
|-------|-------|
| **Status** | LOCKED — Cece decision 2026-08-11 |
| **Ruled by** | Cece |
| **Date** | 2026-08-11 |
| **Affects** | Rows 72 (desk permissions), 85 (pending-payment timeout) |

## Summary

Two open items locked for MVP scope. Both defer fine-grained complexity to post-MVP.

## 1. Pending-Payment Timeout (Row 85)

**Pattern B:** Form arrives first → `pending_review` placeholder. Payment arrives later → attach.

**MVP decision:** Basic automated reminder if payment doesn't follow within a set window. Log of who was reminded reported to Office Desk. Full escalation/refinement deferred post-MVP.

- Reminder mechanism: simple cron or scheduled function that checks `pending_review` registrations older than threshold
- Notification: log entry visible to Office Desk, not automated email to registrant
- Post-MVP: escalation tiers, auto-email reminders, auto-rejection after timeout

## 2. Desk Permission Granularity (Row 72)

**Question:** Does "no single person has blanket access across all functions" mean per-section role checks within each desk, or per-desk role assignments?

**MVP decision:** Basic desk-level `role_feature_access` for MVP. Each desk (Front, School, Office) refines its own fine-grained role permissions independently post-MVP based on departmental monitoring needs.

- MVP: desk-level access control (can this role access this desk at all?)
- Post-MVP: each desk independently refines granularity (e.g., School Desk might need separate permissions for announcements vs. report cards vs. chat)
- Governance: desk owners decide their own permission granularity post-MVP, not a central mandate

## Governance Note

Both decisions keep MVP scope tight. The permission system is designed to be extensible — `role_feature_access` table supports fine-grained features, but MVP only uses desk-level checks. Post-MVP refinement is expected and encouraged per-department.
