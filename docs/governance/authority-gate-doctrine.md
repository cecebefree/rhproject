# Authority-Gate Doctrine (draft 2026-07-22)

## 1. Purpose

An authority gate is a named precondition — Design Freeze 32, Supabase
11, Cloudflare 12 — that blocks dependent work until formally cleared
by the project owner. Gates exist because the blocked work (wiring
tenant routes, environment configuration, production deployments)
cannot be safely designed, tested, or shipped without a binding
decision from the sole authority entitled to make it.

Gates are orthogonal to task completion: a task can be implemented but
still gated. The gate is the lock, not the work item.

## 2. Gate Register

| ID | Name | Blocks | Clearing evidence | Status |
|----|------|--------|-------------------|--------|
| DF-32 | Design Freeze 32 | Phase D/E wiring, route wiring, all tenant-scaffold EF rows | Written ruling in PLAN-STATE.md + commit hash | CLEARED (2026-07-22, PLAN-STATE clearing ruling) |
| SB-11 | Supabase 11 | Cloud URL/key injection, prod db connection | Written ruling in PLAN-STATE.md + commit hash | CLEARED (2026-07-22) |
| CF-12 | Cloudflare 12 | Credential injection, edge deployment, DNS | Written ruling in PLAN-STATE.md + commit hash | OPEN |

All gates are OPEN. No dependent work may proceed past the no-wiring
state until the corresponding row reads CLEARED.

## 3. Clearing Protocol

Only the project owner clears a gate. Clearing requires both:

1. A written ruling in PLAN-STATE.md naming the gate, the decision,
   and the rationale.
2. A commit hash anchoring the ruling.

Agents may recommend, propose, or draft a clearing entry for the
owner's review. An agent may never declare a gate cleared. Any report
asserting "gate cleared" without the corresponding owner-authored,
commit-anchored PLAN-STATE.md entry is void and constitutes an AR-10
evidence-relay completeness violation.

## 4. Violation Handling

Work performed behind an uncleared gate is out of scope regardless of
quality. Discovery procedure:

1. Log the affected file(s), commit range, and gate ID in the
   occurrence log below.
2. The violating work is void and must be reverted.
3. Record as a defect citing the gate ID and the evidence.

No "it works correctly" defence is recognised. Correctness does not
waive a gate.

### Violation occurrence log

*(Empty at doctrine adoption.)*

## 5. Relationship to Standing Rules

- AR-1 (Evidence-relay rule) / AR-10 (Evidence-relay completeness): a gate-clearing claim without pasted
  PLAN-STATE.md content and a commit hash is incomplete evidence.
- AR-7 (Evidence-capture rule): gate-status evidence must be
  command-captured, not reconstructed.
- AR-8 (Operator-ratification rule): gate status is ratified at the
  owner's terminal, not in the session transcript.
- AR-11 (Clean-tree precondition): a session clearing a gate must
  start with `git status --short` empty.
- No-wiring state: all three gates above are OPEN; therefore the
  standing no-wiring ruling remains in force. EF
  scaffolding rows (assign_tenant excepted) are gated behind DF-32.
