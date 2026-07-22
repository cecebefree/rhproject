# AO-005 — DPIA + Disclosure Copy (Row 14)

**Ratified:** 2026-07-22 (owner)
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

## 4. Open Items (require owner/Compliance input)

| Item | Type | Detail |
|------|------|--------|
| Ratified date | Metadata | Stamped 2026-07-22 by owner. |
| Chat provider decision | Policy | Re-confirm DEFECT-001 ruling: no external chat provider. If overturned, name provider, DPA status, and residency in a DPIA amendment. |
| Retention schedule | Legal | Contractual retention period (years) is not specified in repo — deferred to the future Legal document per owner ruling 2026-07-22. |
| Deletion mechanism | Design | How records are ultimately removed after contractual retention expiry is unspecified. Owner/Compliance to decide: Office Desk action, automated purge, or other. |

Items marked **mechanical** (can be executed without Compliance sign-off):
- Disclosure text placement in Registration and Settings UI (row 34–39 wiring tasks)
- Data inventory table above (sourced from schema — update if schema changes)
- DPIA processor section referencing DEFECT-001 (already adjudicated)

Items requiring **owner/Compliance ratification:**
- Retention schedule value (years) — deferred to Legal document
- Deletion mechanism decision
- DPA Register file creation
- Any future chat provider amendment

(End of AO-005 v2)
