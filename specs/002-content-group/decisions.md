# Content Group Architecture — Decision Record

**Date:** 2026-08-10
**Status:** LOCKED (Redhouse MVP)
**Author:** Cece

---

## Three-Layer Content Model

### Layer 1 — Who (role-based grouping)

Determines which **roles** can see which content. Redhouse MVP uses 3 effective groups:

| Layer 1 Group | Underlying Roles (from `profiles.role`) |
|---------------|------------------------------------------|
| student       | `student`, `outside_student`             |
| teacher       | `teacher`, `expert`, `guest`             |
| family        | `family`, `alumni`                       |

This is a **config/seed-data grouping**, not a schema change. The 8 underlying roles in `profiles.role` (`student`, `outside_student`, `family`, `alumni`, `teacher`, `expert`, `guest`, `admin`) are mapped to 3 effective groups via `role_feature_access` seed data. Admin is implicit (bypasses all RLS) and not seeded.

### Layer 2 — Shared vs Split (content_group = 'all' validity)

Determines whether `content_group = 'all'` is valid on a tenant's content rows.

**Redhouse locks this to "always split":**
- `'all'` must **never** appear on actual content rows for tenant 1 (Redhouse).
- Content authors must always explicitly tag rows as `'junior'` or `'senior'`.
- When content applies to both groups, **duplicate the row** — one with `content_group = 'junior'`, one with `content_group = 'senior'`.

The column-level `DEFAULT 'all'` remains in the schema for white-label flexibility, but is not a valid Redhouse content_group value on content rows.

### Layer 3 — Which Variation (content_group values)

The specific `content_group` values a tenant defines.

**Redhouse MVP:** `junior`, `senior` (2 values)

---

## White-Label Configurability

All three layers are per-tenant configurable in future tenants:

| Layer | What's configurable | Redhouse MVP |
|-------|---------------------|--------------|
| 1     | Number of Layer 1 categories, role-to-group mapping | 3 groups (student/teacher/family) |
| 2     | Shared vs split toggle (`'all'` valid on content rows?) | Always split (no `'all'` on content) |
| 3     | Number and names of content_group variations | 2 values (`junior`, `senior`) |

Admin UI for managing these is a future feature — not in MVP scope.

---

## Affected Tables

| Table | Column | Default | Notes |
|-------|--------|---------|-------|
| `daily_verse` | `content_group text NOT NULL` | `'all'` | Column DEFAULT for white-label; Redhouse must use `'junior'` or `'senior'` |
| `bible_plan` | `content_group text NOT NULL` | `'all'` | Same rule |
| `video_of_day` | `content_group text NOT NULL` | `'all'` | Same rule |
| `vlog` | `content_group text NOT NULL` | `'all'` | Same rule |
| `profiles` | `content_group text NOT NULL` | `'all'` | Column DEFAULT for white-label; student/outside_student are UPDATEd to `'senior'`; teacher/family/admin stay at `'all'` |

---

## Filtering Logic

Two-layer server-side filtering (both must pass):

1. **Layer 1 (role):** `role_feature_access` join — which tiles can this role see?
2. **Layer 2 (content_group):** `content_group = 'all' OR content_group = caller's profile content_group` — which content within those tiles?

This filtering is enforced in:
- `get_today_devotional` RPC (SECURITY DEFINER)
- RLS `tenant_read` policies on all four devotional tables

---

## Migration Reference

- **097:** Created four devotional tables (`daily_verse`, `bible_plan`, `video_of_day`, `vlog`)
- **098:** Created `role_feature_access` table + seed data + replaced `get_today_devotional` RPC (Layer 1)
- **099:** Added `content_group` column to four tables + profiles + updated RLS + updated RPC (Layer 2)

---

## Profiles content_group — Role Count Justification

**Hosted profile count (before migration 099):**

| Role | Count | Layer 1 Group | content_group after 099 |
|------|-------|---------------|-------------------------|
| `admin` | 1 | admin (implicit) | `'all'` (column default, untouched) |
| `family` | 2 | family | `'all'` (column default, untouched) |
| `outside_student` | 1 | student | `'senior'` (scoped UPDATE) |
| `student` | 2 | student | `'senior'` (scoped UPDATE) |
| `teacher` | 2 | teacher | `'all'` (column default, untouched) |
| **Total** | **8** | | |

**Reasoning for scoped UPDATE:**

Mixed roles exist on hosted. The original blanket `UPDATE profiles SET content_group = 'senior'` would have forced teachers, family, and admin into the `'senior'` group — but these roles should see **both** junior and senior content (via `content_group = 'all'`).

Corrected approach:
- **student/outside_student** → UPDATE to `'senior'` (only Senior has live users at MVP)
- **teacher/family/admin** → remain at column default `'all'` (see both junior and senior)
- The `content_group = 'all'` RLS/RPC logic already handles this: `content_group = 'all' OR content_group = caller's group`

---

## Future Considerations

- **Admin UI:** Manage Layer 1 groups, Layer 2 toggle, Layer 3 variations per tenant
- **Content authoring tool:** Enforce Redhouse split rule at the content entry level (prevent `'all'` on content rows for tenant 1)
- **Additional tenants:** Each new white-label tenant configures all three layers independently
