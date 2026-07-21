# Register Entry Standard

Governs the format of field-register.md entries. Field naming lock
remains deferred per standing policy; this standard is forward-only
per RG-7.

## RG-1 — Entry anatomy
Every scoped item entry carries exactly five
blocks in order: header ("## <ID> / <artifact> (status: <STATUS>)"),
SCOPE, Out of scope, Acceptance criteria, Evidence basis. Unscheduled
items may collapse to header + single scope paragraph but must say
"unscheduled" in the status.

## RG-2 — Status vocabulary is closed
Item statuses: PLANNED,
PLANNED — unscheduled, BACKED, SEALED, CLOSED. Field statuses remain
BACKED / PLANNED / COMPUTED as already sealed. No new status words
without a ruling.

## RG-3 — Scope is enumerable
SCOPE names exact objects with file:line
anchors where they exist. Words like "various," "related," "etc."
are format violations.

## RG-4 — Out-of-scope is mandatory, not decorative
Minimum one explicit
exclusion per scheduled entry; each exclusion states why
(unchanged-by-design, separate item, or correct-as-is).

## RG-5 — Acceptance criteria are seal gates
Numbered, each independently
verifiable, each stating its evidence form (diff, test section, count).
An entry cannot move to SEALED with any criterion unaddressed in the
seal report.

## RG-6 — Evidence basis dates the decision
Every scheduled entry cites
the audit/grep/log that justified its scope, with date. No evidence
line, no BACKED flip.

## RG-7 — Forward-only
Rules apply to entries written after ratification.
Pre-existing entries retrofit during the final rationalization pass,
one commit, alongside the name lock.
