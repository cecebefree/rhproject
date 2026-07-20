# R-2b — Documents Re-Seed Evidence (Deferred Stub)

**Status:** deferred stub (R-2b). Registered: 2026-07-20b session.
**Pointing at (external, NOT written into):** `/Users/ce/Documents/Redhouse-website`
**Constraint:** zero writes under `/Users/ce/Documents`. This artifact lives in-repo and references the external path only.

## Recorded Evidence

| Field | Value |
|-------|-------|
| Path | `/Users/ce/Documents/Redhouse-website` |
| Stat birth | `Jul 20 12:10:21 2026` |
| Interpretation | re-seed-after-deletion; hold released |
| Evidence source | prior session end-state report @ `0dc922e` |

## Today's Observation (2026-07-20b)

The active session workspace was anomalously anchored at
`/Users/ce/Documents/Redhouse-website/redhouse-real-web` — i.e. a folder
residing _under_ the same `/Users/ce/Documents/Redhouse-website` tree whose
re-seed is recorded above. This corroborates the folder's continued
regeneration / persistence after deletion, consistent with the R-2b
re-seed-after-deletion finding. The working git repo for this session is
`/Users/ce/dev/rhproject-new` (separate from the Documents tree); all
writes were made there, shell-only, absolute paths.

## Follow-up

Full R-2b analysis (root cause of re-seed, hold-release provenance, and any
containment action) remains deferred per the original R-2b ruling. This stub
closes the evidence-registration gap; the substantive investigation is tracked
on the board and not expanded here (no scope creep).

---

## Causation Addendum (2026-07-20c)

**Status:** R-2b OPEN — pending verification probe (folder-delete + fresh-launch test).

### Root cause

The opencode desktop app's global state file —
`/Users/ce/Library/Application Support/ai.opencode.desktop/opencode.global.dat` —
maintains a recents / most-recent-directories list. It contains the stale path
`/Users/ce/Documents/Redhouse-website/redhouse-real-web` **513 times**, each entry
carrying a `time:` launch stamp (e.g. `1783672979`). The app reads this list at
launch; when a recorded directory is missing on disk it silently re-creates it
rather than erroring. That re-creation is the R-2b re-seed: folder birth
`Jul 20 12:10:21 2026` coincides with a session-launch timestamp in the recents
list. The folder is the symptom; this config list is the source of truth the app
falls back to.

### Ruled out

- `opencode.window.*.dat`: contains only the bare `redhouse-real-web` string,
  not the full anchor path — not the launch driver.
- VSCode `storage.json`: references a *different* path
  (`rhproject-new/next-steps-plan`) — unrelated red herring.
- The correct repo `/Users/ce/dev/rhproject-new` IS present in `opencode.global.dat`
  (multiple entries) — the app has seen it; it is simply not the anchor it launches with.

### Remediation plan (UI-first)

1. **In-app (preferred):** open the project / recent-directories picker in the
   opencode desktop app, repoint the active project to `/Users/ce/dev/rhproject-new`,
   and remove/forget the `Redhouse-website/redhouse-real-web` entry. This prunes the
   513-entry recents list at the source.
2. **Folder delete:** only after the in-app repoint, delete
   `/Users/ce/Documents/Redhouse-website` once more.
3. **Verification probe:** launch one fresh session; run `pwd` and
   `ls /Users/ce/Documents/Redhouse-website`. Correct anchor + "No such file or
   directory" together means the loop is broken. If the folder reappears with a new
   birth time, a second config source still references it.
4. **Contingency (`.dat` prune):** staged as LAST RESORT only. Editing the app
   state file risks being overwritten when the app flushes on exit, so it must happen
   with the app **fully closed**, and only after the UI fix fails. A verified backup
   has been taken (see backup path). Exact prune procedure: see Appendix A.

### Backup (taken this session, copy-only)

`/Users/ce/dev/rhproject-new/.local-backups/opencode.global.dat.bak-20260720`
(`.local-backups/` is git-ignored; the backup never enters the repo.)

---

## Appendix A — Contingency: opencode.global.dat prune (NOT applied)

**Status: drafted only. Do NOT apply while the app is running. Apply solely as a
last resort after the UI-first remediation (Appendix-A step 1) fails.**

### Preconditions

1. The opencode desktop app is **fully closed** (no window, no background process).
2. The backup at `.local-backups/opencode.global.dat.bak-20260720` exists and is
   intact (verify with `ls -l` and a `diff` against the live file before any edit).
3. Restore point: if the edit breaks launch, copy the backup back over the live
   file: `cp .local-backups/opencode.global.dat.bak-20260720 <live path>`.

### What to remove

- Every recents/directory entry whose `directory` value is
  `/Users/ce/Documents/Redhouse-website/redhouse-real-web` (513 occurrences as of
  2026-07-20c, each as a `{"directory": "...","time": ...}` object inside the
  recents list).
- The parent recents-list container should retain its other, non-stale entries.

### What to keep

- **All** entries referencing `/Users/ce/dev/rhproject-new` (correct repo) —
  keep every one.
- All other keys in the file (`command.catalog.v1`, window state, settings, etc.)
  — untouched.

### Procedure

1. With the app closed, make a second safety copy: `cp <live> <live>.pre-prune`.
2. Parse the file as JSON (it is a JSON object wrapping internal JSON strings).
   Locate the recents array; filter out objects whose `directory` == the stale path.
3. Write the filtered file back; preserve encoding/whitespace-neutral.
4. Launch the app, confirm the stale entry is gone from recents and that a fresh
   session anchors at `/Users/ce/dev/rhproject-new`.
5. Only after confirming, proceed to the folder delete + verification probe above.
