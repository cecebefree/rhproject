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
