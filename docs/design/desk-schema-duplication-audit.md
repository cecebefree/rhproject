# Desk Schema Duplication Audit

**Status:** Draft
**Date:** 2026-08-12
**Scope:** Cross-schema column and data overlap across `front_desk`, `school_desk`, `office_desk`
**Governance:** Row 41 audit requirement

---

## 1. What Is Duplicated?

| Data                 | Location(s)                                      | Duplication Type    |
|----------------------|--------------------------------------------------|---------------------|
| `tenant_id`          | Every table in all 3 desk schemas (10 tables)    | Column-level        |
| Student name/email   | `office_desk.registrations` + `public.profiles`  | Value-level (conditional) |
| Student phone        | `office_desk.registrations` + `public.profiles`  | Value-level (conditional) |
| `status` (lifecycle) | `leads`, `registrations`, `invoices`, `payments`, `report_cards` | Column-level (different enums) |
| `notes`              | `front_desk.leads`, `office_desk.registrations`  | Column-level        |

---

## 2. Why Is It Duplicated?

### `tenant_id` — Intentional Schema-Level Isolation

Every desk table carries `tenant_id` not as a sync artifact but as a **hard isolation boundary**. RLS policies on all 19 desk tables filter on `jwt_tenant_id()`. Removing `tenant_id` from any desk table would break the RLS model and allow cross-tenant reads.

**Justification:** Access control. Each desk is a security domain. `tenant_id` is the fence. This is the same pattern used by `public.profiles`, `public.report_cards`, and `public.certificates` (migration 043: "plain uuid, no FK — consistent with D12/041 pattern").

### Student Contact Info in `registrations` — Pre-Profile Entity

`office_desk.registrations.student_name/email/phone` duplicates data that _will eventually_ live in `public.profiles`. But registrations are created from leads, which are pre-profile entities (no `auth.users` row yet). The student may not have a Supabase account at registration time.

**Justification:** Temporal mismatch. The data exists in `registrations` because the profile doesn't exist yet. Once the student signs up and a profile is created, the EF copies the values — but the registration row retains its own copy as an immutable audit snapshot.

### `status` Columns — Different Enums, Same Name

Each table's `status` column governs a distinct lifecycle (`enquiry→qualified→invoiced→handed_off` for leads, `pending_init→active` for registrations, `draft→paid` for invoices). These are not duplicated data — they are independent state machines that happen to share a column name.

**Justification:** Domain isolation. Each desk owns its lifecycle. Consolidating into a single status column would create a耦合 (coupling) nightmare.

### `notes` — Independent Fields

`leads.notes` and `registrations.notes` serve different purposes (intake notes vs. registration notes). They are not synced.

**Justification:** Different semantic meaning despite same column name.

---

## 3. Sync Strategy

| Data              | Sync Method | Direction           | Trigger                       |
|-------------------|-------------|---------------------|-------------------------------|
| Student contacts  | EF copy     | `registrations` → `profiles` | On profile creation (assign_tenant EF) |
| `tenant_id`       | No sync     | N/A                 | Each table is source of truth for its scope |
| Status transitions| No sync     | N/A                 | Cross-desk transitions via EF calls (EF-to-EF auth pattern) |

**No triggers or event listeners** handle cross-desk sync. The architecture is intentionally **push-based**: when a lead converts, Front Desk EF calls Office Desk EF to create a registration. When Office Desk approves, it calls School Desk EF to create an enrollment. Each EF writes to its own schema only.

---

## 4. Risk if Sync Fails

| Scenario                                   | Impact                      | Severity |
|-------------------------------------------|-----------------------------|----------|
| Profile creation fails after registration | Student contacts stale in `registrations` | Low — data still accessible via registration |
| EF-to-EF call fails (lead → registration) | Lead stuck in `invoiced`, no registration created | Medium — manual intervention needed |
| `tenant_id` missing on a desk row         | RLS blocks all access to that row | High — row invisible to all users |

**Mitigation:** All cross-desk EF calls use the EF-to-EF auth pattern with retry semantics. Failed calls leave the caller in a known state (e.g., lead status stays `invoiced` until retry succeeds). The `ef_call_log` table tracks every cross-desk call for audit.

---

## 5. Could It Be Deduplicated?

### `tenant_id` — No

**Cost of consolidation:** Would require removing RLS from desk tables and enforcing tenant scoping entirely in EFs. This breaks the defense-in-depth model (RLS + EF server-side filter). Cross-tenant data leak risk increases. **Recommendation: keep.**

### Student Contacts — Partially

**Cost:** Add a `registration.profile_id` FK and copy-on-read instead of copy-on-write. But: (a) profiles may not exist at registration time, (b) immutable audit snapshot requirement means the registration row must retain its own copy, (c) adds a nullable FK + JOIN overhead. **Recommendation: keep current pattern, add sync-on-profile-creation if not already done.**

### Status Columns — No

Different enums, different lifecycles. Consolidation would require a single `entity_type + entity_id + status` table — a generic design that loses type safety and CHECK constraint benefits. **Recommendation: keep separate.**

---

## Summary

The duplications are **intentional and justified**:
- `tenant_id` = access control boundary (non-negotiable)
- Student contacts = temporal mismatch (pre-profile entity)
- Status columns = independent state machines
- Notes = different semantic meaning

No deduplication recommended. The current pattern prioritizes security isolation and domain independence over storage efficiency, which is correct for a multi-tenant desk system.
