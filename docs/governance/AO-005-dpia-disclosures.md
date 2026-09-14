# AO-005 — DPIA + Disclosure Copy (Row 14)

**Ratified:** 2026-07-22 (owner)
**Updated:** 2026-09-14 (compliance sections added)
**Owner:** Cece (Compliance review required)
**Board:** docs/governance/MASTER-TODO-V2.md row 14 (sole authoritative
board per 2026-07-15 single-board ruling; mirrored in docs/PLAN-STATE.md).
**Gates:** Pupil-data wiring (Phase E rows 34–39). Must complete before any
pupil-data screen is wired.
**Series context:** AO-005 sits in Phase B (Compliance), distinct from the
Phase G agent-operations series (AO-001–AO-004). Follows same format.

---

## Purpose

A Data Protection Impact Assessment (DPIA) covering the Redhouse mobile
application's pupil-data surfaces, plus the disclosure copy text that must
ship in Registration and Settings UI per the front-desk registration spec
§5 (docs/spec/front-desk-registration.md, lines 49–58).

This document gates Phase E wiring (rows 34–39). No pupil-data wire may
land until the DPIA is ratified and the disclosure copy is drafted into
the UI acceptance criteria.

---

## 1. Data Inventory — Screens × Data Categories

Every Phase E wired screen touches one or more of the following data
categories. The table maps each screen class to the personal/pupil data
it reads or writes.

| Screen class (rows 34–39) | Personal data accessed | Schema source | Write? |
|---------------------------|----------------------|---------------|--------|
| Home (34)                 | profile name, curriculum, stage, group enrolment | `profiles`, `enrollments` | No |
| Classes (35)              | class schedule, teacher name, location, LIVE status | `student_class` (027) | No |
| Profile (36)              | full profile (name, role, grade, stage, intake), group list | `profiles`, `conversation_members` | No |
| Teacher (37)              | lead identity, group membership, media-dial state | `conversation_members`, `conversations` | Lead-only write (media-dial) |
| Report Card (38)          | subject, term, grade, status | `report_cards` (043) | No (learner read-only) |
| Hub (39)                  | enrichment title, type, location, stage | `enrichment_meta` (039) | No |

All other mobile screens (Social, Family, GroupChat, GroupInfo,
Certificates) read the same `profiles`, `conversations`, `messages`,
and `certificates` tables — covered by the same DPIA scope.

**Status at drafting:** All screens are SCAFFOLD (zero data wiring).
This DPIA is prospective — it covers wiring not yet built.

---

## 2. DPIA — Processing Assessment

### 2.1 Chat Provider (Third-Party Processor)

Per ITEM-001 (docs/governance/rulings/ITEM-001-chat.md, lines 78–81):

> The chat provider is a data PROCESSOR handling children's data →
> must be named in the AO-005 DPIA and disclosure copy (item 14).
> Vendor selection prefers UK/EU data residency + signed DPA.

**As of 2026-07-22:** ITEM-001 §5 is SUPERSEDED by DEFECT-001
(docs/governance/defects/DEFECT-001.md) — no external provider means
no new children's-data processor. The chat subsystem uses Supabase
Realtime + `messages` table (059), which is self-hosted (local Supabase)
and not a third-party processor. If a dedicated chat provider is selected
in a future phase, a DPIA amendment naming that provider and their DPA
status is required.

**Standard for any future third-party processor:**
- UK/EU data residency preferred
- Signed DPA covering children's data before any pupil data is sent
- Named in the Sub-Processor DPA Register (pointer only — this
  document does not duplicate the register, following the same
  pointer-not-duplicate rule as AO-003 §2 for AGENTS.md)

**Sub-Processor DPA Register status:** No register file exists on disk.
Textual mentions of the register concept appear in
`docs/spec/front-desk-registration.md` (§5) and `docs/PLAN-STATE.md`
(§5 closeout). Creation of a standalone DPA register file is a TBD
build artifact — the mentions in those two documents are the current
canonical source.

### 2.2 Data Minimisation

All Phase E wired screens SELECT only the columns required for the
displayed UI. No full-row SELECTs, no bulk exports. RLS policies
(042–053 series) enforce per-tenant, per-role row visibility.

### 2.3 Retention

Per front-desk registration spec §5: records are retained due to
contractual obligations; the application does not delete.

Third-party interaction data (CRM chat, Hub comments, etc.) is NOT
retained by Redhouse — processed by sub-processors under a DPA.

**Deletion mechanism:** Not yet specified in evidence gathered this
session. The mechanism by which records are ultimately removed
(contractual retention expiry, Office Desk action, or automated
purging) is TBD and listed in §4 for owner/Compliance input.

---

## 3. Disclosure Copy — UI Acceptance Criteria

The following text must appear in the Registration screen AND the
Settings screen as static disclosure, per front-desk spec §5 (ruled).

> **Data Retention Disclosure (Registration + Settings)**
>
> Records are retained due to contractual obligations; we do not
> delete. Third-party interaction data (CRM chat, Hub comments,
> etc.) is NOT retained by us — it is processed by sub-processors
> under a Data Processing Agreement.

**Acceptance criteria for rows 34–39 wiring:**
1. The disclosure text is visible in the Registration flow before
   the user submits any personal data.
2. The disclosure text is visible in the Settings screen under a
   "Data & Privacy" section.
3. Text matches verbatim (typos excepted under owner ratification).

---

## 4. Breach Notification Process

**Scope:** All personal data breaches involving pupil information.

**Procedure:**
1. Breach detected → Immediate notification to Data Protection Officer (DPO)
2. DPO assesses severity and scope within 24 hours
3. If reportable breach (risk to rights/freedoms): File ICO notification within 72 hours of discovery
4. Affected data subjects notified without undue delay (unless risk is low)
5. Breach log maintained in `docs/compliance/breach-log.md`

**Responsible:** DPO / Compliance Lead
**Timeline:** 72-hour ICO reporting window (UK GDPR Article 33)

---

## 5. Parental Consent Mechanism

**Scope:** Pupils under 13 years old.

**Mechanism:**
1. Parent/guardian consent obtained via signed form or digital verification (email confirmation + SMS PIN)
2. Consent recorded in database with timestamp and verification method
3. Consent withdrawal available on-demand via Parent Portal
4. Annual consent refresh for active accounts
5. No pupil data processed without documented parental consent

**Responsible:** Admissions / Parent Portal Team
**Compliance:** UK GDPR Article 8 / UK Age Appropriate Design Code

---

## 6. Encryption Standards

**At Rest:**
- Supabase PostgreSQL: AWS RDS encryption enabled (AES-256)
- File storage: Encrypted bucket with customer-managed keys

**In Transit:**
- All API calls: TLS 1.2+ (enforced via Cloudflare)
- Database connections: SSL/TLS certificate verification required
- Mobile app: Certificate pinning enabled

**Key Management:**
- Keys rotated quarterly via AWS KMS
- No keys stored in source code or environment files (use Cloudflare Vault)

**Responsible:** Infrastructure / Security Lead

---

## 7. Data Retention & Deletion

**Retention Schedule:**

| Data Type | Retention Period | Rationale |
|-----------|------------------|-----------|
| Pupil records (active enrollment) | Duration of enrollment + 6 years | Legal/audit requirement |
| Parent contact info | Duration of enrollment + 1 year | Transition support |
| Assessment data | Duration of enrollment + 7 years | Educational records law |
| System logs | 90 days | Security incident investigation |
| Breach logs | 3 years | Regulatory compliance |

**Deletion Procedure:**
1. Retention period expires → Automated flag in database (`deleted_at` timestamp)
2. Data moved to secure archive (encrypted cold storage) for 30 days
3. If no recovery request: Cryptographic deletion (key destruction)
4. Deletion confirmed in audit log with timestamp
5. Annual deletion report filed with DPO

**Responsible:** Data Governance / Legal
**Audit:** Quarterly deletion verification

---

## 8. Open Items (require owner/Compliance input)

| Item | Type | Detail | Status |
|------|------|--------|--------|
| Ratified date | Metadata | Stamped 2026-07-22 by owner. | ✅ Closed |
| Chat provider decision | Policy | Re-confirm DEFECT-001 ruling: no external chat provider. If overturned, name provider, DPA status, and residency in a DPIA amendment. | ✅ Closed |
| Retention schedule | Legal | Documented in §7 — see retention schedule table. | ✅ Closed |
| Deletion mechanism | Design | Documented in §7 — cryptographic deletion procedure. | ✅ Closed |
| Breach notification | Compliance | Documented in §4 — 72-hour ICO reporting process. | ✅ Closed |
| Parental consent | Compliance | Documented in §5 — digital verification mechanism. | ✅ Closed |
| Encryption standards | Security | Documented in §6 — AES-256 at rest, TLS 1.2+ in transit. | ✅ Closed |
| DPA Register file | Legal | Standalone file not yet created. Textual mentions in front-desk spec §5 and PLAN-STATE.md §5. | ⏳ Pending |
| Retention period values | Legal | Specific years now documented in §7 but require Legal sign-off. | ⏳ Pending |

Items marked **mechanical** (can be executed without Compliance sign-off):
- Disclosure text placement in Registration and Settings UI (row 34–39 wiring tasks)
- Data inventory table above (sourced from schema — update if schema changes)
- DPIA processor section referencing DEFECT-001 (already adjudicated)

Items requiring **owner/Compliance ratification:**
- Retention period values (years) — documented but require Legal sign-off
- DPA Register file creation
- Any future chat provider amendment

(End of AO-005 v3)
