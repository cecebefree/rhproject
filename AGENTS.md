# AGENTS.md — rhproject-new

**READ tech-stack.md FIRST** — it describes the target architecture, not the current state.

---

## Current State: Mid-Migration

Single Vite + React 19 app at repo root. Migration to pnpm + Turborepo monorepo is **in progress but not complete**.

Actual structure:
```
repo root/           # Vite app (redhouse-temp)
├── src/             # Current working app (App.tsx, components/, pages/, hooks/)
├── apps/web/src/    # New LMS feature code being scaffolded (features/lms/)
├── supabase/migrations/  # 6 migrations (013–018), LMS schema in progress
├── package.json     # Has workspaces config (apps/*, packages/*) but structure incomplete
└── dist/            # Built output
```

**What's done vs planned:**
- `apps/web/` scaffold exists but is not the active app — `src/` at root is
- `supabase/migrations/013-018` exist (LMS tables: users_profiles, courses, chapters, enrollments, chapter_progress)
- `packages/`, `tenants/`, `supabase/functions/`, `Makefile`, `biome.json`, `turbo.json` do NOT exist yet

---

## Development Commands

```bash
# Current working app (root)
npm run dev      # Vite dev server
npm run build    # Build root app → dist/

# Supabase (when local dev is set up)
supabase start
supabase status

# No make targets exist yet (Makefile is TODO)
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Root app entry |
| `src/pages/` | Page components |
| `src/components/` | Shared components |
| `src/hooks/` | Custom React hooks |
| `src/utils/` | Utility functions |
| `src/types/` | TypeScript types |
| `apps/web/src/features/lms/` | New LMS feature (being built) |
| `supabase/migrations/013-018` | LMS database schema |
| `tech-stack.md` | Target architecture blueprint |

---

## tech-stack.md Notes

`tech-stack.md` describes the **target monorepo** state, not current reality:
- `pnpm`, `Turborepo`, `Biome`, `Makefile` targets are TODO
- Apps (`apps/web`, `apps/mobile`, `apps/lms`) are TODO
- `packages/shared` is TODO
- Edge Functions (6) are TODO
- pgTAP tests are TODO
- CI guards (AI-import, cross-tenant, type-drift) are DONE

---

## Active Work Context

The `specs/001-lms-core/` directory contains the LMS feature spec and plan being implemented:
- `specs/001-lms-core/plan.md` — implementation plan
- `specs/001-lms-core/tasks.md` — task list
- LMS pages in `apps/web/src/features/lms/pages/`
- LMS services in `apps/web/src/features/lms/services/`
- LMS components in `apps/web/src/features/lms/components/`

---

## Workflow

1. Read `tech-stack.md` for target architecture
2. Read `specs/001-lms-core/plan.md` for current implementation plan
3. Ask before making changes to core architecture (the migration plan is not finalized)
4. **Activation gate:** Before any phase work, PROPOSE lead roster to Cece and WAIT for explicit approval. No lead dispatch without prior roster approval (see section 9 HARD RULE).

---

## Active Leadership (Session: 2026-07-03)

**Approved by Cece:** 2026-07-03

| Lead | Status | Focus |
|------|--------|-------|
| **Backend** | ACTIVE | Database schema, RLS policies, Supabase migrations, API services |
| **QA** | ACTIVE | Testing, pgTAP verification, lint, typecheck, validation scenarios |
| **DevOps** | ACTIVE | Local Supabase, types regeneration, build pipeline, migrations |

**Not active this session:** COO, CTO, Frontend, Security, Data, Product Manager, Governance

**Authority:** These leads operate under Cece's approval. All work follows constitution v1.0.0 and the three CI Hard Rules.

---

## Gotchas

- Root `src/` is the active app; `apps/web/` is being scaffolded — don't assume code there is complete
- CI guards are DEPLOYED (guard-ai-import.sh, guard-cross-import.sh, guard-type-drift.sh — all wired in CI.yml)
- ESLint (not Biome) is currently used
- `SUPABASE_SERVICE_ROLE_KEY` handling follows what tech-stack.md describes but no Edge Functions exist yet
- This is a migration-in-progress repo; verify existence of files/dirs before assuming they're implemented
- v2 backlog: AI-import guard — catch variable/ternary require(sdk) — statically undecidable, deferred (Security Lead 0.85)
- **RLS gotcha (SELECT gating UPDATE):** PostgreSQL RLS applies to the read-phase of UPDATE: existing rows are first matched against USING expressions (same as SELECT). If no SELECT policy exists for a role, the UPDATE read-phase returns 0 rows silently — no error, no trigger, just UPDATE 0. This is general RLS behavior per PG docs 13.5.5 (Row Security Policies), not a version-specific bug. Always add a corresponding SELECT policy (or use FOR ALL) when UPDATE access is needed. See migration 052_office_report_card_select.sql for example.

---

## 9. Leadership Council (Above the Swarm)

A leadership layer sits above the 17-agent swarm. Full detail is in tech-stack.md
under "## Leadership Council (Above the Swarm)" — read that section before acting
on any leadership decision.

Quick map:
- Cece — final authority. All approvals and escalations end here.
- Independent Consultant — read-only oversight, benchmarks vs. current industry
  standards, flags to Cece in real time, compiles the monthly report.
- Orchestrator — routes work, convenes 2–3 relevant leads per phase, logs to
  events.jsonl.
- 10 Leads — COO, CTO, Backend [ACTIVE], Frontend, Security, QA [ACTIVE], DevOps [ACTIVE], Data, Product
  Manager, Governance.
- 17-agent swarm — builds under the leads.

Gating: leads are not always on. Orchestrator proposes 2–3 relevant leads; Cece
approves before activation. Tie-breaks: technical → CTO, operational → COO;
unresolved → Consultant → Cece. Human-review triggers: legal/compliance,
irreversible actions, COO-vs-CTO standoff.

### HARD RULE — Roster Approval Required Before Dispatch (effective 2026-07-01)
The Orchestrator MUST:
1. PROPOSE the lead roster (which Leads, for which phase/review) to Cece.
2. WAIT for Cece’s explicit "approved" (or revised roster) before dispatching ANY
   Lead review or council action.
No verdict, recommendation, or finding from any Lead is valid if the roster was not
approved prior to dispatch. Reviews dispatched without prior roster approval are
governance violations and must be logged to events.jsonl with severity HIGH.

### HARD RULE — Deferred Items Gate (effective 2026-07-01)
Open items in .swarm/deferred.md are tracked blockers. No item may be closed in
deferred.md without a Fix-note containing either a commit ref or a verified result.
Status must be one of: Open | In Progress | Watch | Closed. Orchestrator reviews
deferred.md at every phase boundary.

## Working Language
English only. All assistant output, doc writes, commit messages, and logs
must be in English. No language switching regardless of prior context or
model bias. This rule takes precedence over any model-level language defaults.



---

## WHITE-LABEL ARCHITECTURE LOCK (authoritative — do not remap)

1. THREE white-label products, each its own product:
   - LMS
   - Mobile
   - Devotional

2. MOBILE is an OPTIONAL ADD-ON to LMS — NOT a standalone module.
   LMS and MOBILE SHARE ONE SOURCE OF TRUTH. Same data feeds both.
   Mobile is a read-mostly companion fed by the LMS source.

3. DEVOTIONAL is SEPARATE — its own white-label, its own data.
   It is a Redhouse-unique mobile add-on, NOT a permanent mobile-module
   feature. Devotional is untouched by LMS/Mobile data or the 023 retrofit.

4. "TENANT" is the wrong public word — each product is a WHITE-LABEL.
   Within each white-label, tenant #1 = REDHOUSE.
   Redhouse is the first tenant of LMS and carries the Mobile add-on.

5. FK RULE: all Mobile/iOS tables anchor to the LMS SHARED source of
   truth (because Mobile reads LMS data) — NOT the orphan pre-019
   tenants table, NOT a separate mobile table.

6. Different tenants may hold different data; Redhouse is first across all.

STATUS: LOCKED. No free changes. Any remap requires Cece's explicit OK.


---

## MASTER SCHEDULE = AGGREGATOR LOCK (authoritative — do not remap)

THE SCHEDULE CARRIES ALL EVENTS FROM MULTIPLE SOURCES:
   A scheduled event for a user can originate from:
     - LMS      (live classes)
     - MOBILE   (group-chat scheduled events, club live meets)
     - OTT      (e.g. Senior School club live event on OTT)
   Which sources apply depends on what the user is SIGNED UP FOR or
   GROUPED INTO. The schedule aggregates them ALL into one.

HOME PAGE (Mobile) = THE COMBINED VIEW:
   - Home schedule = ALL-IN-ONE: every scheduled event for that user,
     regardless of source (LMS + OTT + group-chat events).

SECTION PAGES = FILTERED SLICES OF THE SAME SCHEDULE:
   - CLASS page schedule -> ONLY class (LMS) scheduled events
   - HUB  page schedule  -> ONLY OTT / enrichment / club scheduled events
   - SOCIAL page schedule-> ONLY group-chat scheduled events
   Same underlying schedule; each page shows its filtered subset.

DRIVEN BY PROFILE (from source of truth = Supabase):
   What a user sees is determined from PROFILE info read from source of
   truth, evaluated against the user's:
     - REGISTRATION
     - PLACEMENT
     - TAGS  (which connect to PAYMENTS)
   -> These decide enrolment/grouping -> which sources feed the schedule.

STATUS: LOCKED. No free changes. Any change requires Cece's explicit OK.


---

## HOW LMS & MOBILE WORK TOGETHER LOCK (authoritative — do not remap)

THE MASTER SCHEDULE IS THE PROOF OF THE RELATIONSHIP:

1. LMS is the ENGINE + SOURCE OF TRUTH.
   - Classes, subjects, times, enrolment, teachers, attendance,
     completion/certificates all LIVE in / resolve from LMS (Supabase).

2. MOBILE is a READ-MOSTLY VIEW.
   - Mobile does NOT run the LMS engine.
   - Mobile READS the same source of truth and PRESENTS it:
       Home (all-in-one schedule), Class, Hub, Social, Profile.

3. THE MASTER SCHEDULE is where they meet:
   - LMS produces the scheduled events (+ OTT + group-chat feed in).
   - Mobile AGGREGATES + FILTERS them for the user:
       Home  = everything (all sources)
       Class = LMS only, Hub = OTT only, Social = group-chat only
   - Same data, one source, many views.

4. WHAT A USER SEES is resolved from PROFILE (registration, placement,
   tags->payments) read from source of truth — identical logic whether
   surfaced on LMS or Mobile.

STATUS: LOCKED. No free changes. Any change requires Cece's explicit OK.
# ⛔ REPO LOCK — LIVE REPO IS: /Users/ce/Documents/Redhouse-website/rhproject-new — redhouse-real-web is DEAD, IGNORE IT. Every session: run pwd FIRST, confirm it ends in /rhproject-new, else STOP.


---

## SUBAGENT FILE ACCESS RULE (NON-NEGOTIABLE)

**Subagents CANNOT access the filesystem directly.** All file reads, writes, globs, greps, and searches MUST be performed by the orchestrator (architect) and the CONTENTS passed into the subagent prompt as inline context.

### Forbidden in subagent prompts:
- Absolute or relative file paths expecting the subagent to read them
- Instructions like "read FILE.md" or "check the contents of X"
- Any tool invocation that touches disk (read, write, edit, glob, grep, bash with file ops)

### Required orchestrator behavior:
1. **Before dispatching a subagent**, the orchestrator reads all files the subagent will need
2. **Injects full file contents** into the subagent prompt under a `## CONTEXT FILES` section
3. **Subagent operates purely on provided context** — no disk access, no path resolution

### Context injection format:
```
## CONTEXT FILES
### path/to/file1.md
<<<FILE_START>>>
[full file contents here]
<<<FILE_END>>>

### path/to/file2.ts
<<<FILE_START>>>
[full file contents here]
<<<FILE_END>>>
```

### Subagent contract:
- Subagent MUST NOT attempt to read files not in CONTEXT FILES
- Subagent MUST NOT output file paths expecting follow-up reads
- Subagent returns analysis, patches, or decisions — never "I need to read X first"
- If context is insufficient, subagent explicitly states: "CONTEXT INSUFFICIENT: need [file/path]"

STATUS: LOCKED. Effective 2026-07-02. Violation = governance breach.


GOVERNANCE — 2026-07-03
CI/CD gate (P2-003) must NOT enable while TypeScript errors exist. Fail-fast on a green baseline only. QA override logged: Cece decision final.
DEVOTIONAL is a fully standalone white-label product. NO devotional code or columns in the shared mobile base. Never reintroduce devotional_enabled or devotional_tenant_id into tenant_mobile.
Live repo is rhproject-new.
