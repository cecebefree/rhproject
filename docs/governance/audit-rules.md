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
