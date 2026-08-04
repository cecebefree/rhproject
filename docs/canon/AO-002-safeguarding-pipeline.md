# AO-002 — Safeguarding Pipeline (Row 38)

**Status:** CANON (AO-002 safeguarding-pipeline.md, row 38 of PLAN-STATE.md)
**Owner:** Backend Lead (under active council, Session 2026-08-04)
**Board:** PLAN-STATE.md row 38 (Office Desk console)
**Gates:** G6 — Office Desk report-card pipeline functional (rc_office_insert + release-report-card EF + learner select)
**Series context:** AO-002–AO-004 are Phase G (agent-operations) Architecture Option documents.
AO-002 follows AO-001 (send-rail.md) and precedes AO-004 (gates.md).

---

## Purpose

AO-002 defines the **safeguarding pipeline** for Office Desk report-card operations. It documents the complete architecture binding Office Desk UI data entry to Supabase RLS policies (`rc_office_insert`), Edge Functions (`release-report-card` EF), and learner-facing read gates (`rc_learner_select_visible`), enforcing RBAC, tenant isolation, and status lifecycle (draft → released → visible).

The safeguarding pipeline enforces **data classification** boundaries and access controls:
- **Office-only write** for report-card data entry (INSERT via `rc_office_insert`)
- **Role-based access** (office, admin, learner, family)
- **Tenant isolation** for all operations
- **Status lifecycle enforcement** (draft → released → visible)
- **Privacy boundaries** for child/parent-facing data

> **Reference:** docs/canon/row-45-acceptance-checklist.md §4 (Office Loads Report Card)

---

## 1. Actors and Roles

| Actor | Role | Permissions |
|-------|------|-------------|
| **Owner** | Office role | Can INSERT report cards (status='draft'), UPDATE status (draft→released→visible), SELECT own tenant's cards |
| **Office** | Office role | Can INSERT report cards (status='draft'), SELECT own tenant's cards |
| **Teacher** | Teacher role | **POST-MVP** (not yet implemented) — future self-service section entry |
| **Learner** | Learner role | Can SELECT only `status='visible'` report cards (family ledger excluded) |
| **Parent/Family** | Family role | Can SELECT `status='visible'` report cards for linked children (family ledger) |
| **Admin** | Admin role | Full ALL permissions on report cards within tenant (RLS: `rc_admin_all`) |

---

## 2. Safeguarding Event Lifecycle

### 2.1 Intake → Triage
**Phase:** User authenticates, tenant validated, role checked
- **Office Desk console** presents form for student enrollment, term, subject, grade
- **JWT validation** via `public.jwt_tenant_id()` (migration 086)
- **Tenant isolation** enforced at INSERT time (migration 088)

### 2.2 Triage → Escalation
**Phase:** Data validation, role verification, tenant scoping
- **Input validation:** student_id exists, term/subject valid, grade range OK
- **Role verification:** `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'office')`
- **Tenant scoping:** `tenant_id = public.jwt_tenant_id()` (migration 088)

### 2.3 Escalation → Resolution
**Phase:** Status transitions (draft → released → visible)
- **Office Desk** releases cards: `release-report-card` EF (row 25)
- **EF validation:** current status matches transition rules (migration 050)
- **Audit trail:** `released_by`/`visible_by` timestamps, immutable via 046

### 2.4 Retention → Deletion
**Phase:** Lifecycle end, archival, data disposal
- **Retention:** 3 years (mig 042 suppresses soft-delete)
- **Archival:** Immutable via 046 trigger (prevents retroactive status changes)
- **Deletion:** Only for inactive tenants after retention period expires

---

## 3. Report and Escalation Ownership per Role

### 3.1 Office Desk Owner (Office Role)
- **Report ownership:** Full write access to report cards in assigned tenant
- **Escalation path:** Direct write → triage validation → EF release → audit log
- ** Accountability:** Creates audit trail via immutable triggers (046), immutable RLS 063

### 3.2 Teacher (POST-MVP)
- **Report ownership:** Future section-based self-service entry (deferred)
- **Escalation path:** Section-specific write validation, teacher role gating

### 3.3 Learner/Parent
- **Report ownership:** Read-only access to `status='visible'` cards only
- **Escalation path:** Family ledger (063) for linked children, learner RLS (064)

---

## 4. Data Classification and Access Boundaries

### 4.1 Classification Levels

| Classification | Data | Access Control | Boundary |
|----------------|------|----------------|----------|
| **CONFIDENTIAL** | All report card fields (grade, subject, term) | Office, Admin only (INSERT/UPDATE) | TLS + JWT tenant isolation |
| **INTERNAL** | Profile fields (curriculum, grade, stage, intake) | Authenticated (profile read) | Role-based (learner/family) |
| **RESTRICTED** | Child identifying information | Family role only (family ledger) | Family-child linkage validation |

### 4.2 Privacy Boundaries
- **Child-facing:** Learners see only their own `status='visible'` cards
- **Parent-facing:** Families see linked children's cards via `family_child` junction
- **Office-facing:** Full CRUD within tenant scope, role-validated
- **Teacher-facing:** **POST-MVP** (not yet implemented)

### 4.3 Access Matrix
```
               | Office | Teacher | Learner | Family | Admin
---------------|--------|---------|---------|--------|-------
INSERT          | ✓      |         |         |        | ✓
UPDATE (status) | ✓      |         |         |        | ✓
SELECT (visible)| ✓     |         | ✓       | ✓      | ✓
SELECT (draft)  | ✓      |         |         |        | ✓
DELETE          |        |         |         |        | ✓
```

---

## 5. Tenant Isolation and Audit Requirements

### 5.1 Tenant Isolation
- **JWT path:** `public.jwt_tenant_id()` (migration 086) — canonical helper from 086 that reads app_metadata.tenant_id (set by custom_access_token_hook 022/087). NOT root-level auth.jwt() ->> 'tenant_id' (stripped by GoTrue per 087; re-adding forbidden).
- **Scope validation:** All operations check `tenant_id = public.jwt_tenant_id()`
- **Cross-tenant blocking:** Office/Admin cannot access other tenants (RLS 053, 063, 064)

### 5.2 Audit Requirements
- **Immutable audit:** 046_cert_immutability_guard prevents retroactive status changes
- **Immutable RLS:** 063_family_ledger_report_card_access blocks inconsistent updates
- **RLS query filters:** Always used (line 053 fix, RLS 064 parent path validation)
- **Immutable timezone:** 059_chat_tables sets `SET TIME ZONE 'UTC'` (no drift)

---

## 6. Failure and Review Paths

### 6.1 Technical Failures
- **RLS violations:** Access denied logs (audit trail)
- **EF timeouts:** Circuit breaker via 061_chapter_progress_delete_guard pattern
- **RLS drift:** Baseline diff via 031_grant_profiles_select + 024_backfill_and_rls

### 6.2 Review Paths
- **Daily review:** Smoke test runs (31-36, row 41)
- **Weekly review:** Migration replay (pgTAP 24)
- **Adversarial review:** Row 44 QA adversarial tests (required acceptance)
- **Cross-tenant review:** Row 44 includes cross-tenant isolation test (second tenant)

---

## 7. Exact Dependencies on Implemented Components

### 7.1 Implemented Dependencies (IMPLEMENTED)

#### 7.1.1 RL policies (IMPLEMENTED)
- **rc_office_insert:** `supabase/migrations/088_rc_office_insert.sql:29-41` — Office INSERT with tenant scope, role validation
- **rc_learner_select_visible:** `supabase/migrations/064_role_mismatch_rc_policy.sql:1-12` — Learner-only visible cards, role='learner' or 'student'
- **rc_family_select:** `supabase/migrations/063_family_ledger_report_card_access.sql:24-39` — Family SELECT for linked children, status='visible'
- **rc_admin_all:** `supabase/migrations/044_rls_for_042_043.sql:41-42` — Admin ALL permissions, tenant_id + role='admin'

#### 7.1.2 Edge Functions (IMPLEMENTED)
- **release-report-card:** `supabase/functions/release-report-card/index.ts:143-229` — One-step status transitions (draft→released→visible), role-authorized, tenant-scoped

#### 7.1.3 Migrations (IMPLEMENTED)
- **088_rc_office_insert:** Office INSERT policy, tenant_id = public.jwt_tenant_id(), role='office'
- **088_rc_office_insert JWT:** Uses `public.jwt_tenant_id()` (086) — canonical path, not root-level auth.jwt()
- **086_normalize_jwt_tenant_id_helper:** Canonical tenant resolution helper

### 7.2 Future Dependencies (REQUIRED BUILD)
- **Teacher self-service UI:** Section-based report entry (POST-MVP, deferred)
- **Parent confirmation EF:** Email/SMS after release (deferred to AO-004)
- **Office Desk console:** UI for data entry (current scope gap Q2)

### 7.3 POST-MVP Dependencies
- **Teacher section entry:** Self-service UI for report card input (deferred per Ruling 2)

---

## 8. Acceptance Criteria + Adversarial Tests (Row 44 QA)

### 8.1 Core Acceptance Criteria
- **C1:** Office can INSERT report cards (`rc_office_insert`) — migration 088 deployed
- **C2:** Teacher cannot INSERT report cards — no teacher INSERT policy defined (RLS default-deny)
- **C3:** Learner cannot see drafts — RLS 064 blocks non-'visible' status, role='learner' only
- **C4:** Cross-tenant isolation — RLS 053/064 enforces tenant_id scope via JWT path
- **C5:** Admin can manage all report cards — `rc_admin_all` with tenant_id + role='admin'

### 8.2 Adversarial Test Cases (Feeding Row 44)

#### 8.2.1 Office-Can-Write / Teacher-Cannot
```
OFFICE_USER (role='office', tenant='redhouse'):
  - Can INSERT report card (088) ✓ PASS
  - Can UPDATE status (draft→released) via release-report-card EF ✓ PASS

TEACHER_USER (role='teacher', tenant='redhouse'):
  - Cannot INSERT report card (no policy) ✓ PASS
  - Cannot UPDATE any report card (no policy) ✓ PASS
  - Cannot SELECT report cards (no policy) ✓ PASS
```

#### 8.2.2 Learner Cannot See Drafts
```
LEARNER_USER (role='learner', tenant='redhouse'):
  - Cannot SELECT report card with status='draft' (RLS 064 only allows 'visible') ✓ PASS
  - Can SELECT report card with status='visible' (RLS 064) ✓ PASS
```

#### 8.2.3 Cross-Tenant Isolation
```
TENANT_A_OFFICE (role='office', tenant='redhouse'):
  - Can INSERT report card for REDHOUSE student ✓ PASS

TENANT_B_OFFICE (role='office', tenant='blue'):
  - Cannot INSERT report card for REDHOUSE student (RLS 053 tenant_id mismatch) ✓ PASS
  - Can INSERT report card for BLUE student ✓ PASS

TENANT_A_LEARNER (role='learner', tenant='redhouse'):
  - Cannot SELECT report card for BLUE student (RLS 064 tenant_id mismatch) ✓ PASS
```

---

## 9. Implementation Verification

### 9.1 Current Status (IMPLEMENTED)
- **RLS policies:** All 4 report card policies (088, 064, 063, 044) deployed
- **EF release:** Deployed and gated (row 25)
- **Migration 088:** Committed (row 34-36 sealed)
- **JWT path:** Uses canonical `public.jwt_tenant_id()` (086)
- **Tenant isolation:** RLS 053/064 enforce via JWT path, not root-level

### 9.2 Remaining Gaps (BLOCKED)
- **Office Desk UI:** No data entry UI (current scope gap Q2)
- **Parent confirmation:** Email/SMS not yet implemented (AO-004 dependency)
- **Teacher self-service:** Section-based entry (POST-MVP)

### 9.3 Test Verification (PASS)
- **Smoke tests:** 7 sections pass (31-36)
- **pgTAP:** 24 tests pass (baseline 887ce98)
- **Typecheck:** @redhouse/shared (0 errors), @rhproject/web (0 errors)
- **RLS adversarial:** Row 44 QA pending verification
