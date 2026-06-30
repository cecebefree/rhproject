# Memory Recovery Guide

> How to recover context after a session ends or resume interrupted work.

---

## Session State Location

OpenCode Swarm persists state in `.swarm/` at the repo root:

```
.swarm/
├── plan.json              # Current implementation plan
├── plan.md                # Human-readable plan
├── evidence/              # Phase evidence (reviews, tests, etc.)
├── council/               # Council criteria & verdicts
├── knowledge.jsonl        # Learned lessons
├── spec.md                # Project specification
└── [phase]/               # Per-phase artifacts
    ├── drift-verifier.json
    ├── phase-council.json
    └── ...
```

---

## Quick Resume Checklist

### 1. Read Source of Truth First

**Always start here:**
```bash
# Read tech stack (definitive reference)
cat tech-stack.md

# Read current plan
cat .swarm/plan.md

# Check plan status
cat .swarm/plan.json | jq '.phases[] | {id, name, tasks: .tasks | length}'
```

### 2. Review Phase State

Check which phase was last worked on:
```bash
# Look for most recent phase evidence
ls -la .swarm/evidence/

# Check plan progress
cat .swarm/plan.json | jq '.phases[] | select(.status != "completed") | {id, name, status}'
```

### 3. Recall Knowledge

```bash
# Use /swarm memory recall to find relevant past decisions
/swarm memory recall [query]

# Check knowledge base
cat .swarm/knowledge.jsonl
```

### 4. Get Up to Speed

```bash
# Run diagnostics
/swarm diagnose

# Check git status for uncommitted work
git status
git diff --stat

# Review recent commits
git log --oneline -10
```

---

## Common Recovery Scenarios

### After a Crash / Forced Exit

1. Re-read `tech-stack.md` and `.swarm/plan.md`
2. Run `/swarm memory recall` for any relevant decisions
3. Check `git status` for any uncommitted work
4. Resume from last completed task using the plan

### After a Long Break (>1 week)

1. Read `tech-stack.md` (may have been updated)
2. Read `.swarm/plan.md` and `spec.md`
3. Run `/swarm memory recall` for key decisions
4. Check `CHANGELOG.md` or git log for recent changes
5. Review any TODO comments that may have been added
6. Run `make typecheck && make lint` to verify working state

### After a Branch Switch

1. Stash any uncommitted changes first: `git stash`
2. Switch branch
3. Run `make setup` to ensure dependencies are correct
4. Unstash and resolve any conflicts
5. Run `make typecheck` to verify

### After Pulling from Remote

1. Check for merge conflicts
2. Run `make typecheck && make lint`
3. Run `make test` if migrations changed
4. Check `supabase/config.toml` for drift

---

## Key Files to Never Lose

| File | Purpose | Backup? |
|------|---------|---------|
| `.swarm/plan.json` | Implementation plan | Git |
| `.swarm/knowledge.jsonl` | Learned lessons | Git |
| `packages/shared/src/types/database.ts` | Supabase types | Git |
| `supabase/migrations/*` | Schema | Git |
| `tech-stack.md` | Architecture | Git |

---

## Session Boundary Signals

When a session ends, capture:
1. What task was in progress
2. What files were modified
3. What decisions were made
4. What remains undone

Example session summary to record:

```
## Session End State

**Last completed task:** [task-id]
**Files modified:** [list]
**Decisions:** [key decisions]
**Next action:** [what to do next]
**Blockers:** [any known blockers]
```

---

## Recovery Commands Reference

```bash
# Full context dump
/swarm status

# Review plan
/swarm show-plan

# Check knowledge base
/swarm knowledge

# Review evidence
/swarm evidence summary

# Get Council input on a question
/swarm council [question]
```

---

## Anti-Patterns to Avoid

- **Don't** skip reading `tech-stack.md` on resume
- **Don't** start coding before checking the plan
- **Don't** assume the plan is current — verify
- **Don't** commit to `database.ts` manually — use `make types`
- **Don't** break CI guards (AI isolation, tenant isolation, type drift)