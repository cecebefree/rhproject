# Audit Rules — standing defect classes (ratified 2026-07-18)

These rules are grep-auditable where possible and apply to every
arc report and every pgTAP file, retroactively and forward.

## AR-1 Evidence-relay rule
Evidence must be PASTED, never referenced. Any report containing
"as shown above", "verbatim copy of my report", "confirmed from
that report", or equivalent, without the accompanying raw output,
is automatically incomplete regardless of accuracy. Origin: three
occurrences across D-062 and D-054/055-REVIEW.

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
