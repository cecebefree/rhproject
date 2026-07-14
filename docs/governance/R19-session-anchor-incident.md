# R19 — Session Anchor Doctrine

Status: Sealed
Date: 2026-07-14
Scope: All agent sessions operating on this repository

---

## The Failure Class

A **regenerating sandbox failure** occurs when an agent session's working
directory drifts from the true project root. The session believes it is
operating on the correct repository but is in fact writing to a stale or
orphaned path — a sandbox that once matched the repo but no longer does.

**Root cause:** The session's launch `cwd` was set at session start and never
revalidated. Between sessions, the human may have moved directories, renamed
folders, or switched branches in a parent directory. The agent inherits a
stale path and proceeds to operate on phantom files.

**Consequences:**
- Migrations applied to the wrong database
- Commits created on detached paths that never reach the remote
- Tests passing against stale schema, masking real regressions
- Guard scripts executing against nothing

This is not a hypothetical. It has happened in this project.

---

## The Five-Point Anchor Check

Every session MUST execute the following five checks at session start, before
any work begins. No exceptions. No shortcuts. No "I already know the path."

```bash
# 1. Confirm working directory resolves to the project root
pwd
# Expected: /Users/ce/dev/rhproject-new

# 2. Confirm git recognizes this as the repo root
git rev-parse --show-toplevel
# Expected: /Users/ce/dev/rhproject-new

# 3. Confirm the remote matches the intended repository
git remote -v
# Expected: git@github.com:cecebefree/rhproject.git

# 4. Confirm HEAD is at the expected commit
git log --oneline -1
# Expected: current HEAD (verify against last known hash)

# 5. Confirm the Supabase container is running and attached to this project
docker ps --filter "name=supabase_db_rhproject-new" --format "{{.Names}}"
# Expected: supabase_db_rhproject-new
```

**All five must pass.** If any check fails, STOP. Do not proceed. Report
the failure to the human. The session is not anchored.

---

## Narration Is Not Evidence

An agent may say "I ran the tests and they passed." This is narration. It is
not evidence.

**Evidence requires:**

1. **Artifacts** — Files written to disk. Test output captured to a file. Diff
   output saved. Migration hashes recorded. If it is not on disk, it did not
   happen.

2. **Executed tests** — The actual test runner output, verbatim. Not "all 18
   tests pass." The output showing 18/18 with zero failures. Captured to a
   file or displayed in full.

3. **Sealed hashes** — Commit hashes. Migration file SHA-1 values. Evidence
   bundle hashes. These are immutable proof that a specific state existed at
   a specific time.

**Rule:** If you cannot point to an artifact, a test output, or a hash, you
have not done the work. You have only described it.

---

## Guard-Respected Cleanup

Some operations in this project require destructive actions: removing files,
dropping tables, resetting databases, force-pushing branches.

**These operations belong to the human.** The agent does not perform them
unless explicitly instructed, and even then, only with the human present to
observe the result.

Destructive operations include but are not limited to:
- `rm -rf` on project directories
- `DROP TABLE` or `DROP SCHEMA`
- `supabase db reset` (without human confirmation)
- `git push --force`
- Modifying CI workflow files ()
- Sealing or retiring migration files

The agent's role is to **propose, implement, and verify.** The human's role
is to **authorize, execute, and seal.** This boundary is not negotiable.

---

## Session Start Checklist

Use this checklist at the start of every session:

```
[ ] pwd = /Users/ce/dev/rhproject-new
[ ] git rev-parse --show-toplevel = /Users/ce/dev/rhproject-new
[ ] git remote = git@github.com:cecebefree/rhproject.git
[ ] git log --oneline -1 = <current HEAD verified>
[ ] docker ps shows supabase_db_rhproject-new running
[ ] All five checks passed? → proceed / fail → STOP
```

---

## Why This Exists

Rulings are not paperwork. They are contracts between the human and the
agent, binding on both sides. R19 exists because a real failure occurred,
the failure was preventable, and the prevention is a five-command check
that takes fifteen seconds.

Fifteen seconds of anchors saves hours of phantom work.

---

## Relationship to Other Rulings

- **Ruling 1 (Item 13):** Item 13 closing criteria (a)-(c) require artifacts.
  R19 ensures those artifacts are anchored to the real repository.
- **Master-Todo Items 24, 25:** Gated on Item 13. R19 ensures the guard
  that gates them operates on the correct path.
- **Guard scripts:** All guard scripts (`guard-ai-import.sh`,
  `guard-cross-import.sh`, `guard-type-drift.sh`, `guard-field-register.sh`)
  execute against the repo at `cwd`. R19 ensures `cwd` is correct.
