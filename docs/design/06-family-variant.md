# Design 6 — Family Variant (Ledger + Per-Child Records)

**Status:** FROZEN — ITEM-009 design freeze, 2026-07-15
**Frozen by:** Cece (explicit approval)
**Role:** `family` (field-register line 372, first-class role)

---

## Visibility Rule

Family sees ONLY linked child's data. Linkage = `student_class` where `student_id` belongs to the family member's `profile.id` (via a future `family_student_link` table — **PLANNED**).

## Ledger Fields (sourced verbatim from registration pipeline — ITEM-004)

| Field | Source | Table | Status | Demo Treatment |
|-------|--------|-------|--------|----------------|
| `child_name` | student profile | profiles.name | **BACKED** | Live query |
| `child_role` | student profile | profiles.role | **BACKED** | Live query |
| `enrollment_status` | registration pipeline | profiles.registration_status | **BACKED** | Live query |
| `invoice_ref` | Front Desk lead record | (PLANNED — lead table, ITEM-004 §1) | **PLANNED** | (a) Statically seeded, "coming soon" |
| `invoice_amount` | Lead record | (PLANNED — lead table) | **PLANNED** | (a) Statically seeded, "coming soon" |
| `payment_status` | Lead record | (PLANNED — lead table) | **PLANNED** | (a) Statically seeded, "coming soon" |
| `core_flag` | student profile | profiles.has_core | **BACKED** | Live query |
| `access_window` | student profile | profiles.access_starts_at / access_ends_at | **BACKED** | Live query |

### Demo Ledger Rendering (Option a — chosen)

Statically seeded section with visible "coming soon" treatment:

```
Invoice:        INV-2026-001 (sample)
Amount:         R 12,500 (sample)
Payment Status: Pending (sample)
                Coming soon — full invoice tracking in next phase
```

The section renders, the data is seeded, the caveat is visible. Expo port does not need to guess.

## Per-Child Records

Family sees a tab per linked child. Each tab shows:

1. **Groups** — child's conversation_memberships (same as Profile → My Groups, read-only)
2. **Attendance** — PLANNED (D22 session_attendance table, parked)
3. **Report Cards** — filtered to student_id = child's profile.id, status = visible only (per R18)
4. **Certificates** — filtered to user_id = child's profile.id, status = issued only

## Write Access

None. RLS-enforced: family role has SELECT only on child's data. No INSERT/UPDATE/DELETE on any child record (per ITEM-001 §2: "broadcast + reply-to-office").

## Office Reply Channel

Family can reply to office messages within the Family group conversation (broadcast + reply-to-office per ITEM-001).
