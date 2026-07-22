# R15-SCOPE — Gate-Contracts Scope Note

**Board row:** 15 (MASTER-TODO-V2, Phase B)
**Status:** Pending → DRAFT for Cece review
**Authority:** authority-gate-doctrine.md (rows 6/15) — owner clears; this doc scopes the contract.

---

## Purpose

Row 15 requires a scope note that "names the MVP subset of the 14 section 5 gates" (MASTER-TODO-V2 row 15). Three authority gates — DF-32, SB-11, CF-12 — are registered in the doctrine. This doc defines for each: what contractual evidence flips it OPEN → SATISFIED.

This is a PLANNING document only. No gates change status.

---

## 1. DF-32 (Design Freeze) — CLEARED 2026-07-22

| Field | Value |
|-------|-------|
| Status | CLEARED (PLAN-STATE §DF-32 CLEARING RULING) |
| Clearing hash | `cbe2c99` |
| Verifier | Cece (owner-only per authority-gate doctrine §3) |
| Evidence recorded | PLAN-STATE.md §DF-32 CLEARING RULING lines 822–833; ruled and committed by Cece 2026-07-22 |
| Clearing citation | Commit `cbe2c99` added the full DF-32 CLEARING RULING text to PLAN-STATE.md: Design docs FROZEN, lifted items 3/3 complete, rows 23/28/29 and data wiring lose DF-32 gate. Owner-only clearing verified. |

### What SATISFIED requires

1. **Design-lock proof:** all 8 design docs (05-my-groups, 06-family-variant, 07-teacher-variant, 08-report-card-tab, chat-adjustments, expo-port-plan, v0 element register) written and FROZEN.
2. **Blocker close:** row 31 (v0 design verification) sealed PASS-WITH-NOTES at `e7ed3b1`.
3. **Written ruling** in PLAN-STATE.md naming the gate, decision, and rationale.
4. **Commit hash** anchoring the ruling.

Dependency map (rows DF-32 currently blocks): 23, 28, 29 — UNGATED by DF-32 as of clearing. Remaining gates: SB-11 (CLEARED), CF-12 (OPEN), row 22.

### Remaining work before row 15 can claim SATISFIED for DF-32

None — DF-32 is CLEARED. Record in scope note is diagnostic only.

---

## 2. SB-11 (Supabase 11) — CLEARED 2026-07-22

| Field | Value |
|-------|-------|
| Status | CLEARED (PLAN-STATE §SB-11 CLEARING RULING) |
| Clearing hash | `9273fd8` |
| Verifier | Cece (owner-only) |
| Evidence recorded | PLAN-STATE.md §SB-11 CLEARING RULING lines 837–845; ruled and committed by Cece 2026-07-22 |
| Clearing citation | Commit `9273fd8` added the full SB-11 CLEARING RULING text to PLAN-STATE.md: cloud Supabase project live (`ebptjjsmeltykqqvcvqo`, eu-west-1), all 3 env keys verified in .env, EFs disk-verified. Ungates rows 23/28/29/34-39. CF-12 still gates 40/42. |

### What SATISFIED requires

1. **Cloud Supabase project live** — verified URL `ebptjjsmeltykqqvcvqo` (eu-west-1), repo-linked.
2. **Credentials in .env (git-ignored):** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — all three verified present, values never printed.
3. **Edge Functions disk-verified:** `supabase/functions/` contains assign_tenant + 4 scaffolded EFs (row 22 DONE at `9e0f749`).
4. **Written ruling** in PLAN-STATE.md naming the gate, decision, rationale.
5. **Commit hash** anchoring the ruling.

Dependency map (rows SB-11 currently gates/unblocks):
- **Unblocks:** 23, 28, 29 — ungated w.r.t. SB-11 as of clearing.
- **Phase E rows 34–39** — ungated w.r.t. SB-11.
- **Does NOT unblock** rows 40/42 (still gated by CF-12, row 12).

### Remaining work before row 15 can claim SATISFIED for SB-11

None — SB-11 is CLEARED. Record is diagnostic only.

---

## 3. CF-12 (Cloudflare 12) — OPEN

| Field | Value |
|-------|-------|
| Status | OPEN |
| Verifier | Cece (owner-only) |
| Evidence location | To be recorded in PLAN-STATE.md at clearing |

### What SATISFIED requires (scope draft)

1. **Cloudflare credentials injected** — API token, zone ID, account ID in secure env (GitHub Actions secrets or equivalent).
2. **DNS records verifiable** — domain resolves through Cloudflare nameservers with proxying enabled.
3. **Edge deployment pipeline testable** — `wrangler deploy` or equivalent CI step runs without credential errors.
4. **Written ruling** in PLAN-STATE.md naming the gate, decision, rationale.
5. **Commit hash** anchoring the ruling.

### Dependency map (rows CF-12 currently blocks)

| Blocked row | Item | Other gates |
|-------------|------|------------|
| 40 | Lovable website intake — Turnstile | 9, 23 |
| 42 | Cloudflare deploy | 11, 12 |

Rows 40 and 42 remain fully gated until CF-12 clears.

### Open questions for Cece (awaiting owner input)

1. Are Cloudflare credentials managed via GitHub Actions secrets, Doppler, or another vault?
2. What is the minimum deploy target — just `apps/web` (Vite/RR v7 site), or also Edge Functions via Cloudflare?
3. Does CF-12 require a live DNS change, or can it clear with credentials-in-env + dry-run proof?
4. Should CF-12 clearing also include the Turnstile site-key integration (gating row 23), or is that downstream?

---

## 4. Interaction map

```
DF-32 CLEARED ──┬── unblocks: 23, 28, 29 (EF implementation)
                └── unblocks: Phase E data wiring (34–39)
SB-11 CLEARED ──┬── same set as DF-32 above
                └── does NOT unblock: 40, 42
CF-12 OPEN ─────┬── blocks: 40 (Lovable intake)
                └── blocks: 42 (Cloudflare deploy)
Row 22 PENDING ─┴── blocks: 23, 28, 29, 27b (EF-to-RPC swap task)
```

---

## 5. Row 15 SATISFIED criteria (proposed)

Gate-contracts scope note is SATISFIED when:

- [ ] All three gates (DF-32, SB-11, CF-12) named with OPEN/CLEARED status and clearing evidence per cleared gates.
- [ ] Each gate lists its dependent board rows by number.
- [ ] CF-12 dependency map includes all rows currently blocked (40, 42 at minimum).
- [ ] Security lead countersign appended (per Appendix B item 15 close-out criterion).
- [ ] Cece signs off.

---

**Scope draft for Cece review. No gate status changed.**
