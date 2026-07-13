# ITEM-002 — Ruling: Certificates & PDF Generation

**Status:** Sealed — 2026-07-13

---

## Decision

**BUILD** in-house PDF generation service (Edge Function + template layer).
No third-party credentialing vendor. Blockchain/badge formats remain
**REJECTED**; school-stamped PDF is the artifact.

## Document Classes

One engine, five templates, ascending gravity:

| # | Class | Description | Signatory | Design Weight |
|---|-------|-------------|-----------|---------------|
| 1 | Club Attendance Recognition | Light participation slip | Club Lead | Modest |
| 2 | Enrichment Course Certificate | PROFESSIONAL premium design; hours/outcomes stated | Teacher + Head | Premium |
| 3 | Core Subject Report Card | Termly academic document; grades, comments, attendance | Teachers + Head | Standard |
| 4 | Year Completion Certificate | Annual, all-core-passed; promotes to next year | Head | High |
| 5 | Grade 12 Graduation Certificate | FLAGSHIP capstone; highest design investment | Head + institutional seal | Flagship |

## Doctrine

  - **Recognition ladder:** design weight scales with gravity; Club
    slip deliberately modest to protect upper-tier value.
  - **Graduation certificate = Redhouse institutional credential.**
    Cambridge results (private-candidate route) are the
    qualification; the certificate never claims exam status.
  - **Spine-sourced only:** all certificate data rendered from
    ratified tables; no free-typed certificate content.
  - **Issuance via Edge Function;** certificates row is authoritative,
    PDF is its rendering; reissue regenerates against same ID.
  - **Verification:** certificate ID + QR → public spine read endpoint
    confirming issuance (native, no vendor).
  - **Storage:** file_url external at V0 → Supabase Storage signed
    URLs at V1 (per Decision #6 revised).
  - **Surfaces:** My Certificates (learner); family app post-MVP;
    generation hooks into yearly roll-over cycle.

## Phase C Scope Additions

  - certificates table: id, user_id, class, source_ref,
    issued_at, signatory, file_url, status
  - Five templates (one per class)
  - Issue/reissue Edge Function
  - Public verify endpoint (certificate ID + QR)

---

Signed: Cece -- final human gate. 2026-07-13.
