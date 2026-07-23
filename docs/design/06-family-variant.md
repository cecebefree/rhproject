# Design 6 — Family Profile (Distinct Screen, Four Sections)

**Status:** FROZEN — Cece ruling 2026-07-23 (amended per FAIL-AS-WRITTEN, replaces 2026-07-15 version)
**Frozen by:** Cece (explicit approval, 2026-07-23)
**Amendment note:** Original 2026-07-15 version ruled FAIL-AS-WRITTEN after browser walk. This version supersedes it.
**Role:** `family` (field-register line 372, first-class role)
**Visual design:** DEFERRED to Lovable intake (row 40). This document freezes structure and intent only — same PASS-ON-DOCS condition as design 05.

---

## Layout

Family profile is a DISTINCT screen, NOT the student/teacher tab layout. It contains four sections vertically:

### (a) Account Activity

The family's own ledger and activity view.

| Field | Source | Table | Status | Demo Treatment |
|-------|--------|-------|--------|----------------|
| `invoice_ref` | Front Desk lead record | (PLANNED — lead table, ITEM-004 §1) | **PLANNED** | Statically seeded, "coming soon" |
| `invoice_amount` | Lead record | (PLANNED — lead table) | **PLANNED** | Statically seeded, "coming soon" |
| `payment_status` | Lead record | (PLANNED — lead table) | **PLANNED** | Statically seeded, "coming soon" |

Demo rendering:

```
Invoice:        INV-2026-001 (sample)
Amount:         R 12,500 (sample)
Payment Status: Pending (sample)
                Coming soon — full invoice tracking in next phase
```

### (b) Children

List of linked children via `family_child` (040, BACKED). Tapping a child opens that child's profile as a separate full-page view — a read-only MIRROR of exactly what the child sees in the mobile app. Copy-view only; family cannot edit anything. RLS: SELECT only, scoped via `family_child`.

The child's mirrored page reflects the standard student profile layout in full:
- All standard Profile fields (name, role, curriculum, grade, stage)
- **Records tabset** — Report Card | Certificate tabs (same as student sees)
- **My Analytics** — child's curated metrics (attendance, performance, classes missed; seeded where backend tables absent)
- **Access** — standard sticker list of what is open for the child
- Child's My Groups mirror (same as Profile → My Groups, read-only)
- Child's full Section B (Verse of the Day, Music, Bible 365, Daily Vlog — all four tiles)

No per-child tabs inside the family profile. Each child opens as its own page.

### (c) My Groups

The family's OWN group memberships — same `conversation_members` rule as other roles. Read-only list. No interactions (mute/leave) on Profile — those live on Social page. Same GroupCard rendering as design 05.

### (d) Access

Standard access section (sticker list of what is open for this user). Text-only, per existing Access pattern.

---

## Home Screen Section B — Role Scoping

**RULE:** Family role Home screen Section B shows ONLY the Verse of the Day tile. Music, Bible 365, and Daily Vlog are NOT shown to the family role. Student and teacher roles keep all four tiles.

Children's full Section B (all four tiles) remains visible inside each child's read-only mirror page per (b) above.

---

## Write Access

None. RLS-enforced: family role has SELECT only on own and linked child's data. No INSERT/UPDATE/DELETE on any child record (per ITEM-001 §2: "broadcast + reply-to-office").

## Office Reply Channel

Family can reply to office messages within the Family group conversation (broadcast + reply-to-office per ITEM-001).
