# Row 45 — Acceptance Checklist

**Status:** CANON (v4 board row 45 — formerly UNALLOCATED, assigned 2026-08-03)
**Owner:** Cece (terminal human gate)
**Source:** OWNER SCOPE RULINGS (2026-08-03) + PLAN-STATE.md verification pass

This checklist defines the end-to-end acceptance path for the MVP launch.
Every item MUST be verified before Cece sign-off is granted.

---

## Flow: Intake → Three Desks → Devotional → Six App Sections → Office Loads Report Card → Parent Sees It After Release

### 0. Intake (Front Desk)

- [ ] **Lead form submits** — `submit-lead` EF deployed, Turnstile widget token
      verified server-side (cloudflare test key for E2E; prod key at row 9).
- [ ] **Lead row lands** in `public.leads` (migration 078) with correct
      tenant scoping (Redhouse tenant #1 only, per Ruling 3).
- [ ] **Parent receives confirmation** — email/SMS via Lovable front-desk
      intake (row 40 / AO-001 send-rail.md).

### 1. Three Desks

#### Front Desk
- [ ] **Console access** — Front Desk console (v5 row 41) authenticates
      with appropriate role.
- [ ] **Registration status** — can set `registration_status = 'approved'`
      on profiles (migration 026 fields).

#### Office Desk
- [ ] **Console access** — Office Desk console authenticates with
      `role = 'admin'` or `role = 'office'`.
- [ ] **Report card data entry UI** — Office Desk can enter report-card
      rows per student (term, subject, grade) → INSERT via `rc_office_insert`
      (migration 088). No per-teacher section ownership required (Ruling 2).
- [ ] **Report card release** — Office Desk can advance status
      draft → released → visible via `release-report-card` EF (row 28b).
      Gate contracts v1 enforced (one-step transition, role authority).
- [ ] **Tenant isolation** — Office in tenant A cannot create or release
      report cards for students in tenant B (verified via rc_office_insert
      + rc_office_manage tenant scoping, migration 053/086).

#### School Desk
- [ ] **Console access** — School Desk console authenticates.
- [ ] **Schedule management** — can view/manage `schedule_slot` entries
      (migration 037) within tenant scope.

### 2. Devotional

- [ ] **`get_today_devotional` RPC** (migration 082) returns active
      devotional item for the caller's tenant, keyed by day-of-year.
- [ ] **Home screen renders** devotional — type, url_or_text, is_iframe
      fields from RPC.
- [ ] **Tenant isolation** — RPC returns only devotional items for the
      JWT tenant (RLS via jwt_tenant_id).
- [ ] **DEVOTIONAL is standalone white-label** — separate from LMS/Mobile
      data (WHITE-LABEL ARCHITECTURE LOCK, AGENTS.md §4). No
      `devotional_enabled` or `devotional_tenant_id` in tenant_mobile
      (Governance — 2026-07-03, DOCTRINE).

### 3. Six App Sections (Mobile)

The mobile app (`apps/mobile/app/(tabs)/`) has six primary sections:

| # | Section | Route | Row | Data Source | Status |
|---|---------|-------|-----|-------------|--------|
| 1 | Home | `/(tabs)/index` | 31 | `profiles`, `get_today_devotional` RPC (082), `schedule_slot`, `get_announcements` | DONE-LOCAL |
| 2 | Classes | `/(tabs)/class` + `/(tabs)/class-detail` | 32 | `courses`, `student_class`, `get_teacher_name` RPC (083), `schedule_slot`, `chapters_read` RPC (077) | DONE-LOCAL |
| 3 | Hub | `/(tabs)/hub` + `/(tabs)/hub-detail` | 36 | `enrichment_meta`, `schedule_slot` | PENDING |
| 4 | Social | `/(tabs)/social` | 37 | `conversations`, `conversation_members`, `messages` (059) | PENDING |
| 5 | Report Card | `/(tabs)/report-card` | 35 | `report_cards` SELECT (rc_learner_select_visible, 044) — READ-ONLY | PENDING |
| 6 | Profile | `/(tabs)/profile` | 33 | `profiles` (name, role, created_at) | DONE-LOCAL |

- [ ] **All six tabs present** in `_layout.tsx` tab bar.
- [ ] **Rows 31-36** wired with supabase import (template: 3ece873).
- [ ] **Row 35 (Report Card)** is READ-ONLY only — renders visible cards
      via `SEED_CARDS` or `report_cards` SELECT; NO INSERT/UPDATE/DELETE
      on this screen (Ruling 2: report-card write is office-only).

### 4. Office Loads Report Card

- [ ] **Office Desk enters** report card data per student via the data
      entry UI (scope ADDITION per Q2, 2026-08-03).
- [ ] **INSERT succeeds** — `rc_office_insert` (migration 088) allows
      office-role users to INSERT with `status = 'draft'`,
      `tenant_id` = JWT tenant, `created_by` = auth.uid().
- [ ] **Report card row persists** in `public.report_cards` with correct
      `student_id`, `term`, `subject`, `grade`, `status = 'draft'`.
- [ ] **No per-teacher section ownership required** — office can create
      cards for any student in their tenant (Ruling 2).

### 5. Parent Sees It After Release

- [ ] **Office releases** — `release-report-card` EF advances
      draft → released (office/admin only, tenant-scoped).
- [ ] **Office publishes** — EF advances released → visible
      (admin only per gate contracts v1).
- [ ] **Parent (learner) sees** — `report-card.tsx` (row 35) renders
      only `status = 'visible'` cards via `rc_learner_select_visible` /
      `rc_family_select` (044/063/086).
- [ ] **Family mirror also sees** — family-role users linked via
      `family_child` (040) can SELECT visible report cards
      (`rc_family_select`, migration 063).
- [ ] **Status chain enforced** — draft → released → visible; no skipping
      (trigger guard 051, EF gate contracts v1) .

---

## Gate Closure Requirements

| Gate | Criterion | Evidence |
|------|-----------|----------|
| G1 | All six app sections present and wired (rows 31-36) | PLAN-STATE.md row status + commit hashes |
| G2 | Office Desk can INSERT + release report cards (row 33/35, mig 088) | migration 088 + EF deploy status |
| G3 | Parent sees released+visible cards only (row 35, READ-ONLY) | report-card.tsx status filter + RLS policy |
| G4 | Three desks accessible (v5 row 41) | Office Desk data entry UI + console access |
| G5 | Devotional renders on Home screen (082 RPC) | index.tsx wiring + RPC test pass |
| G6 | Intake pipeline functional (submit-lead EF + leads table) | row 23 + row 40 AO-001 |

**Cece sign-off blocks on G1–G6.**
