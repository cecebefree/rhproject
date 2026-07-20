# AO-003 — Agent Registry (Row 45)

**Ratified:** 2026-07-20 session (ae32461 baseline). Owner: AO doc series (row 43 dependency:
AO-001 send-rail.md). Board: MASTER-TODO-V2.md row 45. Series siblings: AO-001 (43), AO-002 (44),
AO-004 gates.md (46).

## Purpose

A single registry defining, per AI agent, the contract it must satisfy before it is granted
tools or runtime. This is the governance surface for agent scope — it is the human-readable
companion to the machine-enforced agent config.

## Required Per-Agent Record (schema)

Every agent admitted to the runtime MUST carry a record with these fields:

| Field | Definition | Enforcement |
|-------|------------|-------------|
| id | stable agent identifier | unique; referenced by kill-switch + audit log |
| role | human-readable function (e.g. coder, reviewer, sme) | free-text, must match duty |
| scope | file/domain surface the agent may read or write | deny-by-default; explicit allow-list |
| tools | the tool set granted (read-only vs write) | least-privilege; no blanket grant |
| kill_switch | how the agent is halted mid-run | must exist before first invocation |
| audit_hooks | what the agent logs (decisions, file touches, rulings) | mandatory; feeds evidence store |

## Source of Truth

- **AGENTS.md** is the live agent constitution. Scope, tool, and guardrail discipline for agents
  is defined there and MUST NOT be restated here — this registry points, it does not duplicate.
- The runtime's own agent/evidence store lives under **.swarm/** (evidence/, deferred.md,
  events.jsonl). Audit hooks in the schema above write into that store.

## Current State (verified 2026-07-20)

- **No concrete agent-definition files exist on disk** (no *.agent.md, no agents.json in the
  repo). Therefore this registry defines the CONTRACT only; no agent entries are populated yet.
- The contract is PLANNED-to-be-populated once agent definitions (coder / reviewer / sme / critic
  et al.) are extracted from AGENTS.md into enumerated records.

## Relationship to Test Bar

Agent-gated changes still fall under docs/governance/test-bar-policy.md (row 21) for any
backend surface they touch.

(End of agent-registry.md)
