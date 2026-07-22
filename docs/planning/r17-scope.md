# R17-SCOPE — P2 Reconciliation (Governance Sweep)

**Board row:** 17 (MASTER-TODO-V2, Phase B)
**Prior reconciliation:** [`ae32461`] — row 17 DONE, session 2026-07-20
**This sweep:** re-audit after 2026-07-22 session changes. **PROPOSED corrections only — not applied.**

---

## Source documents compared

| Source | Role |
|--------|------|
| MASTER-TODO-V2.md (lines 1–198) | Sole authoritative board (§SINGLE-BOARD RULING) |
| PLAN-STATE.md (lines 445–543) | Detail tracker — board mirror with per-task evidence |
| Disk (`ls`/`git log`) | Ground truth |
| authority-gate-doctrine.md | Gate table |

---

## 1. PARTIAL rows — delta from claimed state

### Row 10 — Brand hex + logos

| Claimed | Verified delta |
|---------|---------------|
| PARTIAL — 13 hex approved, placeholder-grade; TODO-FINAL-LOGO x6 outstanding (docs/brand-assets.md) | File `docs/brand-assets.md` exists on disk. Content: partial. Delta: **none** — status accurately reflects reality. No correction proposed. |

### Row 14 — AO-005 DPIA + disclosure copy

| Claimed | Verified delta |
|---------|---------------|
| PARTIAL — draft v2 written, owner content review pending (reverted from DONE per hold order 2026-07-22) | File `docs/governance/AO-005-dpia-disclosures.md` exists at commit `0f0c967`. Owner revert from DONE to PARTIAL executed same session (hold order text in session transcript). Delta: **none** — status accurate. Correction: none. Blocked on Cece content review. |

---

## 2. CLOSED rows — delta from claimed state

### Row 13 — FIELD-REGISTER LOCK

| Claimed | Verified delta |
|---------|---------------|
| CLOSED — per item-13-field-register-guard.md (2026-07-15) | File `supabase/guard-field-register.sh` exists. Cited in `ci.yml`. Delta: **none** — status and close-out criteria (a)(b)(c) all satisfied per ruling. No correction proposed. |

### Row 24 — Expo port screens

| Claimed | Verified delta |
|---------|---------------|
| CLOSED — 11/11 screens, tsc clean, freeze intact. Governance ITEM-024 sealed by Cece. Hashes: af66274, 3ad4459, 778d0ad, c4417e2 | All four hashes resolve in git log. ITEM-024 sealed. Delta: **none**. No correction proposed. |

---

## 3. DONE rows — hash audit (per AR-10 spirit)

AR-10 (evidence-relay completeness) requires every DONE claim to carry a citeable commit hash. Below: every DONE row, hash presence, and recommendation.

| Row | Status text | Hash present? | Verdict | Proposed correction |
|-----|------------|---------------|---------|-------------------|
| 1 | "ITEM-001-chat.md Sealed 2026-07-13" | **No** | Pre-AR-10; predates hash convention | Add `git log` hash of the sealing commit |
| 2 | "ITEM-002-certificates.md Sealed 2026-07-13" | **No** | Same as row 1 | Add sealing-commit hash |
| 3 | "BUILD-R16-R18-demo-scope.md Sealed 2026-07-13" | **No** | Same | Add sealing-commit hash |
| 4 | "S8 exemption per audit/deferred text" | **No** | No hash, no seal marker | Add the commit that created the deferred.md or S8 exemption text |
| 5 | "ITEM-024 sealed; tech-stack.md amended (6d1a38a)" | **Yes** `6d1a38a` | Compliant | None |
| 7 | "rulings/ITEM-004-d64bb05-registration-pipeline.md Sealed" | **No** — `d64bb05` is a ruling ref in the filename, not a commit hash | The commit that sealed this ruling is not recorded | Add sealing-commit hash |
| 8 | "design-links.md + 4 design docs present" | **No** | "present" is disk-evidence, not hash-evidence | Add the commit that added these design docs |
| 9 | "tech-stack.md amended (6d1a38a)" | **Yes** `6d1a38a` | Compliant | None |
| 11 | "SB-11 CLEARED per PLAN-STATE clearing ruling 2026-07-22" | **Partial** — clearing ruling exists in PLAN-STATE.md but hash not cited in MASTER-TODO-V2 cell | The ruling commit (`ea58bcc` or similar) should be stated in the status cell | Add the PLAN-STATE.md commit hash to MASTER-TODO-V2 row 11 |
| 13 | "per item-13-field-register-guard.md (2026-07-15)" | **No** | CLOSED but no anchor hash | Add the commit that created/finalized guard script and ci.yml wiring |
| 16 | "deferred.md D1-D31 complete incl. D26" | **No** | Hash not cited | Add the commit that completed the deferred sweep |
| 17 | "sealed at ae32461" | **Yes** `ae32461` | Compliant | None |
| 18 | "d7d11fb (1911 del) + e50799d (90 del)" | **Yes** Two hashes | Compliant | None |
| 19 | "commit 3cfcab8" | **Yes** `3cfcab8` | Compliant | None |
| 20 | "docs/planning/ios-backend-doc.md" | **No** | No hash | Add the committing hash for ios-backend-doc.md |
| 21 | "docs/governance/test-bar-policy.md (240/24 floor)" | **No** | No hash | Add the committing hash for test-bar-policy.md |
| 22 | "[9e0f749]" | **Yes** | Compliant | None |
| 25 | "043_report_cards_and_certs.sql present" | **No** — "present" is disk-evidence | Three migrations in that wave (043, 050, 051) need a hash per AR-10 | Add the committing hash for 043 (likely `457f7c4` based on row 26) |
| 26 | "[457f7c4]" | **Yes** | Compliant | None |
| 27 | "[f9ce73d]; [7385720]" | **Yes** Two hashes | Compliant | None |
| 32 | "e7ed3b1" | **Yes** | Compliant | None |
| 33 | "042 + 047 present" | **No** — "present" is disk-evidence | Two migrations; cite their commit | Add hash for 042 and 047 migrations |
| 45 | "docs/governance/agent-registry.md" | **No** | No hash | Add the committing hash for agent-registry.md |

**Summary: 14 of 25 DONE/CLOSED rows lack a citeable hash in their status cell.**
- 10 pre-date AR-10 adoption (rows 1–4, 7, 8, 13) — older convention
- 4 are recent but omitted the hash (rows 20, 21, 25, 33, 45)

**Recommendation:** batch-apply hashes in a single housekeeping commit per AR-10 §"evidence must be relayed with a citeable commit hash" — NOT in this sweep (proposed only).

---

## 4. Divergence: MASTER-TODO-V2 vs PLAN-STATE

Three rows where the two authoritative sources disagree:

| Row | MASTER-TODO-V2 | PLAN-STATE | Which is ground truth | Correction |
|-----|---------------|-----------|----------------------|-----------|
| 11 | DONE — SB-11 CLEARED per clearing ruling | Pending | **MASTER-TODO-V2** — SB-11 was cleared 2026-07-22 per Cece ruling in PLAN-STATE §837–845. PLAN-STATE stale. | Update PLAN-STATE row 11 to DONE with hash |
| 30 | Pending | DONE — EF/RPC inventory complete `c4f76f2` | **PLAN-STATE** — `docs/EF-RPC-INVENTORY.md` exists on disk; DF-32 partial ruling recorded it DONE | Update MASTER-TODO-V2 row 30 to DONE with hash |
| 31 | Pending | DONE — PASS-WITH-NOTES `e7ed3b1` | **PLAN-STATE** — `docs/V0-DESIGN-REVIEW.md` exists, DF-32 clearing ruling references it | Update MASTER-TODO-V2 row 31 to DONE with hash |

**Side effect:** MASTER-TODO-V2 Phase D header says "Gate 32: fires on 31" with row 32 already DONE but row 31 Pending — this is contradictory. Row 31 must read DONE for row 32's DONE claim to be coherent.

---

## 5. Proposed corrections (NOT applied — for Cece review)

| # | Action | Location |
|---|--------|----------|
| C1 | Update PLAN-STATE row 11: Pending → DONE (match MASTER-TODO-V2) | PLAN-STATE.md line 470 |
| C2 | Update MASTER-TODO-V2 row 30: Pending → DONE (match PLAN-STATE) | MASTER-TODO-V2.md line 53 |
| C3 | Update MASTER-TODO-V2 row 31: Pending → DONE (match PLAN-STATE) | MASTER-TODO-V2.md line 59 |
| C4 | Add missing hashes to rows 1, 2, 3, 4, 7, 8, 13, 16, 20, 21, 25, 33, 45 | MASTER-TODO-V2.md |
| C5 | Add PLAN-STATE hash to row 11 status cell | MASTER-TODO-V2.md line 24 |

Each of these is a one-line board-text edit. Cece: approve, reject, or amend per row.

---

**Scope draft for Cece review. No board changes applied.**
