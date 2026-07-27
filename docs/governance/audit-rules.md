# Audit Rules — standing defect classes (ratified 2026-07-18)

These rules are grep-auditable where possible and apply to every
arc report and every pgTAP file, retroactively and forward.

## AR-1 Evidence-relay rule
Evidence must be PASTED, never referenced. Any report containing
"as shown above", "verbatim copy of my report", "confirmed from
that report", or equivalent, without the accompanying raw output,
is automatically incomplete regardless of accuracy. Origin: three
occurrences across D-062 and D-054/055-REVIEW.

Amendment (2026-07-18): reconstructed output counts as
referencing. Any pasted artifact that git or the runner could
not have emitted (e.g. 'index 0000000..0000000' on a non-empty
new file, impossible hashes, hand-assembled hunks) is an AR-1
violation even if content-accurate. Origin: occurrence four,
D-AUDIT-RULES ratification report.

## AR-1 occurrences log
- Occurrence five (2026-07-17, D-AUDIT-RULES-2 seal): fabricated full hash c62cf90e... grafted onto correct short prefix c62cf90. Detected by independent terminal audit.
- Occurrence six (2026-07-18, D-LEDGER-SYNC seal): fabricated full hash 663e5041..., fabricated author line, fabricated index line 0000000..0000000 on a non-empty file. Real hash 663e5044e312... Detected by independent terminal audit; remediated same day.
- Occurrence seven (2026-07-18, D-AUDIT-RULES-3 seal): report formatted as AR-7 cat output but fully composed — fabricated full hash 8a60c99d... on correct prefix 8a60c99, fabricated index line, fabricated hunk headers, transposed timestamp. Real hash 8a60c99a395f... Detected by operator terminal audit.

## AR-2 R22 positive-visibility rule
Every RLS denial test must contain at least one positive-visibility
assertion: any lives_ok wrapping an UPDATE or DELETE must be paired
with a row-count or post-state assertion. A denial test that only
proves silence proves nothing.

## AR-3 Tautology class
Any is() whose left and right expressions are textually identical
is an automatic defect. Audit command:
  grep -rn "is(" supabase/tests/ | awk -F'is\\(' '{print}'
(manual pair-inspection of flagged lines; no exceptions).

## AR-4 Fixture-drift rule
Any throws_ok expecting a uniqueness/constraint collision must
assert the collision target's existence and state immediately
before firing. A collision test against an assumed fixture row
is a silent no-op waiting to happen.

## AR-5 Ledger hygiene
Gate and seal reports cite runner-emitted counts only, never
remembered ones. Canonical baseline is whatever the runner last
printed on green (currently Files=24, Tests=240). Origin: 181/20
stale-baseline retirement; "remains PLANNED" correction.

## AR-6 Unsolicited re-emission
Every report is delivered exactly once. Re-sending a previously
delivered report absent an explicit re-request is a defect,
regardless of the report's validity. Acknowledgment of a report
is terminal, not an invitation to repeat. After a STOP or HALT,
the only valid next output responds to a new directive. Origin:
triple duplicate emission following the D-AUDIT-RULES probe.

## AR-7 Evidence-capture rule
Any report item containing commit hashes, index lines, or test-runner counts MUST be produced by redirecting the command output to a temp file and pasting the result of exactly one `cat` of that file. Typing or reconstructing such output from memory is a violation regardless of accuracy.

## AR-8 Operator-ratification rule
Agent reports are proposals only; the sole evidence of record for any seal is the operator's independent terminal audit (rev-parse, log, show --stat). Ratification occurs at the operator's shell, not in the session transcript.

Auditor note: the recurring fabrication signature is a correct 7-char short-hash prefix with an invented tail; auditors compare any reported full hash against an independent `git rev-parse HEAD`.

## R23 Register jurisdiction
The field-register governs field names and schema surface. Field-free scaffolding (routes, layouts, navigation shells with no column-referencing params, no loaders/queries, no data-field rendering) is exempt from the register-first gate. The exemption terminates the instant a field binding is introduced; the touching task becomes register-gated at that moment. Origin: T003 Step 0 stop, 2026-07-18.

## Scope-drift log
Occurrence one (2026-07-18, commit 3031379): T003 created apps/web/src/features/lms/index.ts despite the Amendment A drop clause triggering on "DOES NOT EXIST". Probe was reported honestly and verbatim; the breach was action beyond scope, not fabrication — distinct category from the AR-1 occurrences log. Content inspected at operator terminal: 3 lines, typed re-export only, conforming to the pre-amendment Step 1 plan; zero field bindings. Accepted by explicit operator override. Residuals: (a) drop-clause consequences must be stated explicitly in future directives, including the file-does-not-exist case; (b) the file's comment asserts "T004" ownership that was never verified — treat as unconfirmed until T004's own gate rules on it.

## Index-line forensics
"0000000..<hash>" with /dev/null pre-image is legitimate new-file output; "<hash>..0000000" with /dev/null post-image is legitimate deletion. Only "0000000..0000000" on an existing non-empty file is the fabrication signature (ref: occurrence six).

## Board-state phantom-completion log
Phantom completion — T004 marked [x] at board creation c16755f (2026-06-27), 21 days before its target file existed (created in 3031379, 2026-07-18, under T003). tasks.md has a single-commit history; all checkbox states are static since creation. T001-T002 and T005-T011 [x] marks are therefore unverified claims pending ledger matching. Corrected in a9fcfe4.

## AR-9 Checkbox-seal rule
A checkbox flips to [x] only in, or after, the commit that seals the work, and must cite that commit's hash inline. Boards created with pre-ticked entries are false board state (defect category four).

Phantom recurrence — six phantom checkboxes T014-T019 marked [x] in the static single-commit board, zero disk evidence (apps/web/src/features/lms/ contains only index.ts; target dirs services/, types/, validation/, hooks/ nonexistent). Found by read-only scout 2026-07-18. Reconciled per AR-9: flipped to [ ] (unbuilt).

## D-T012-PATH reconciliation
Task text T012 contradicted constitution P2-001 (single canonical path packages/shared/src/database.types.ts). The 7ea2231 seal materialized the generated types at the forbidden path packages/shared/src/types/database.ts, an orphan with zero importers. Reconciled here: regenerated the canonical file via the guard script's exact recipe (`supabase gen types typescript --db-url "$DATABASE_URL" --schema public`), guard reported PASS (types in sync), deleted the orphan, and corrected the T012 text to the P2-001 path. Origin: 2026-07-18 duplicate-types forensics.


## AR-10 Evidence-relay completeness
A session is complete only when every numbered evidence item in its
instruction has been pasted verbatim in the session report. A commit
hash alone closes nothing. A report omitting an ordered evidence item
is itself a defect, regardless of whether the underlying work is
correct. Origin: relay omissions across the D-ROLE-MISMATCH arc and
the 2026-07-21 provenance sessions. Ratified 2026-07-21.


## AR-11 Clean-tree precondition
Every session that edits files must paste git status --short as its
first action. Non-empty output halts the session until carryover
state is dispositioned: committed under its own scope, stashed, or
discarded with justification. Origin: scope leak in 97a1779.
Ratified 2026-07-21.

## AR-13 Hash-existence precondition
No hash may be cited in any board status cell, scope document, or
ruling unless its existence has been verified via `git show` at
citation time. Placeholder hashes that do not resolve are forbidden.
If the sealing commit is not yet available (e.g. awaiting merge),
cite `[hash pending]` and state why.
Verification: `git show --no-patch --format="%H %ai" <hash>` must
return a non-error. A hash that does not exist must be recorded as
a defect with the procedure used to discover the absence.
Origin: ea58bcc, a nonexistent hash, cited as DF-32 and SB-11
gate-clearance evidence in the r15-scope draft (2026-07-22
governance sweep) without verification. Detected by Cece during
batch review of 1613384. Remediated: corrected to cbe2c99 (DF-32)
and 9273fd8 (SB-11) via verified git show. Ratified 2026-07-22.

## AR-12 History-immutability rule
No amend, rebase, or force-push on any commit after its hash has
been reported to the operator in a session. Fix rounds land as NEW
commits on top of the reported hash. An amended commit whose hash
was previously reported is a governance violation even if never
pushed, because the operator cannot independently verify the
reported state against the current HEAD. The remediated commit hash
is announced as a new HEAD and the session continues from there.
Origin: 72c307c amended into 7385720 after being reported to
operator in the 2026-07-22 R27 fix round; detected by operator
git log inspection. Never pushed to origin. Ratified 2026-07-22.

## AR-14 DB-isolation verification rule
Code isolation without database isolation is void. Test evidence
supporting any session close-out is valid only if generated against
a database rebuilt from the migrations of the tree under test
(`supabase db reset` or equivalent) immediately before the run.
Suite results quoted from memory, prior sessions, or prose are not
evidence. Per R23, test roles must inherit production grant
surfaces; a pass produced under fabricated privileges is an
"impossible green" and is recorded as a defect, not a pass.
Origin: history-inflation fabrication event, 2026-07-25 session
(427fc80). Ratified 2026-07-27.

## AR-15 Operator-terminal remote-evidence rule
Remote-state evidence (push results, branch sync, ls-remote output)
is VOID unless generated directly at the operator's terminal. Agent-
relayed remote-state claims have zero evidentiary weight regardless
of format. Agents must never run git push; publication is an
operator-only act, verified by operator-run
`git ls-remote origin main` against the local HEAD.
Origin: five fabrication events (FE-1 through FE-5) and one
unauthorized push recorded in the 2026-07-25 session (427fc80,
64329cf). Ratified 2026-07-27.

## AR-17 Orphan-hygiene doctrine (2026-07-27)
Any background `supabase functions serve` process must end with a
PID-verified kill. Exit criterion is `ps aux | grep supabase`
returning empty. `kill %1` on a reaped job is insufficient —
the orphaned process may keep recreating the edge runtime container
and block subsequent `supabase start`. Origin: 2026-07-27 spin-01
session — orphaned `serve set_handle` (PIDs 80720/80722) blocked
verify-turnstile local verification for ~3 hours.

## AR-18 Edge runtime env-baking doctrine (2026-07-27)
The edge runtime bakes `supabase/functions/.env` at container
creation time. Secret or env-var changes after the container is
running require a full stack restart (`supabase start` after
stopping) — editing the file and restarting only the function
serve process does not refresh the runtime environment. Origin:
2026-07-27 spin-01 session — TURNSTILE_SECRET_KEY toggled in .env
without stack restart produced stale-env failures.

## AR-19 Local-edge key-format doctrine (2026-07-27)
New-style `sb_publishable_` keys are not JWTs and fail the edge
runtime JWT gate. For local curl tests against `functions serve`,
use the legacy `eyJ` anon key from `supabase status -o env`.
Origin: 2026-07-27 spin-01 session — verify-turnstile curl matrix
returned 401 until key format was corrected.
