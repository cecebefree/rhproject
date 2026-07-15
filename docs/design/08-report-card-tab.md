# Design 8 — Report Card Tab (Status Chain + Released-Only Visibility)

**Status:** FROZEN — ITEM-009 design freeze, 2026-07-15
**Frozen by:** Cece (explicit approval)
**Schema:** report_cards (field-register lines 251–276, BACKED)

---

## Enum (quoted verbatim from field-register.md line 258)

```
status  text NOT NULL DEFAULT draft (CHECK: draft, released, visible)
```

**Three-state confirmed.**

## Status Chain (1:1 mapping to UI states)

| DB Status | UI State | Who sees it | Who sets it |
|-----------|----------|-------------|-------------|
| `draft` | "Draft" | Teacher (created_by = auth.uid()) | Teacher INSERT |
| `released` | "Released" | Office (role=admin/office, tenant_id match) | Office UPDATE via Edge Function |
| `visible` | "Visible" | Learner (student_id = auth.uid()) | Edge Function advances released → visible |

**Transient state note:** `released` is a transient state — release and visibility advance in one Edge Function transaction; no card rests at `released`.

## RLS Mapping (field-register lines 269–275)

- `rc_teacher_insert` — teacher can INSERT draft
- `rc_teacher_select_own` — teacher sees own drafts
- `rc_teacher_update_own` — teacher can UPDATE own drafts
- `rc_office_select` — office sees all in tenant
- `rc_office_manage` — office can release (status → released → visible)
- `rc_learner_select_visible` — learner sees only status = visible
- `rc_admin_all` — admin bypass

## R18 Reconciliation

R18's "released-only visibility" is the **gate condition** — learner can only see cards that have passed through `released`. The `visible` state is the terminal UI state the learner sees. The two are consistent: `released` = permission grant; `visible` = display state.

## Seed Demo Card

status = `'visible'` (terminal state, learner sees it immediately).

## Learner Query

```sql
WHERE student_id = auth.uid() AND status = 'visible'
```

## State Table (final)

| Transition | Actor | Mechanism | Condition |
|------------|-------|-----------|-----------|
| — → `draft` | Teacher | INSERT | created_by = auth.uid(), role = teacher |
| `draft` → `released` | Office | Edge Function UPDATE | role = admin/office, tenant_id match |
| `released` → `visible` | Office | Edge Function UPDATE (same transaction) | visible_at = now() |
