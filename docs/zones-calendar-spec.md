# Zones & Universal Calendar Spec

Source of truth: red-house-portal.base44.app/zones-calendar (read 2026-07-06)
Status: LOCKED planning reference. All items confirmed against live portal.
Purpose: durable proof-of-decisions for AI planning of current build work.

## 1. Core Principle
- ONE uniform yearly calendar for everyone — same 36-week frame across all curricula, zones, and intakes.
- Zone 3 (UK + SA + EU) is the immovable anchor = "HOUR 0" (Cape Town UTC+2).
- Zone = RENDER-ONLY for class identity. It does NOT split the class.
- Class identity key = department + intake + stage + grade.
- Intake = an OFFSET onto the shared 36-week frame (not a separate calendar).

## 2. The 5 Zones (timezone bands — render + teacher-roster)

| Zone | Region | Offset vs anchor | Local window (summer) → CT |
|------|--------|------------------|-----------------------------|
| 1 | USA-2 + Canada (Pacific) | −9 hrs · UTC−7 | 08:00–16:00 → 17:00–01:00 CT |
| 2 | USA-1 + Brazil (Eastern) | −6 hrs · UTC−4 | 08:00–16:00 → 14:00–22:00 CT |
| 3 | UK + SA + EU (HOUR 0) | Anchor · UTC+2 | 08:00–16:00 SAST |
| 4 | India + Asia | +4 hrs · UTC+5:30 | 08:00–16:00 → 04:00–12:00 CT |
| 5 | Australia + NZ | +8 hrs · AEST UTC+10 | 08:00–16:00 → 00:00–08:00 CT |

- Every zone teaches the SAME 08:00–16:00 local 8-hour window.
- Zone = student render attribute + teacher-roster constraint.
- Fixed at 5 bands.

## 3. Season Mode (DST toggle)
- SUMMER (NH DST ON): UK on BST (UTC+1) → UK students start 07:00 local to stay aligned with Cape Town 08:00. Zone 2 = UTC−4; Zone 1 = UTC−7.
- WINTER (NH DST OFF): offsets revert.
- Cape Town UTC+2 is ALWAYS Hour 0 — anchor never shifts.
- Brazil does NOT observe DST.
- DST switch dates are legislated / pre-known = HARD external anchors.

## 4. Intakes (currently 2, extensible to 3)
- GROUP A — January intake (SH cycle): Jan–Nov instructional, Dec break. Students: South Africa, Australia, New Zealand.
- GROUP B — September intake (NH cycle): Sep–Jun instructional, Jul–Aug break. Students: UK, Europe, USA, Canada.
- June intake = planned future 3rd value (NOT live yet).
- RULE: model intake as an extensible lookup, NEVER a hardcoded enum. Adding June = one row insert, zero schema migration.

## 5. Universal 36-Week Calendar — TEMPLATE + ANNUAL DATES
- STRUCTURE is fixed: 36 instructional weeks, 4 universal holidays, 2 exam windows, Zone 3 = Hour 0.
- DATES are RE-ADJUSTED EVERY YEAR. Calendar is NOT set once — it is re-dated annually.
- Proof from portal (dates shift year to year):
  * Passover: Mar 22–28 (2027) → Apr 10–16 (2028)
  * Seasonal: Oct 25–31 (2027) → Oct 23–29 (2028)
  * Mid-year: Jun 14–Jul 4 (2027) → Jun 19–Jul 9 (2028)
  * Year-start: Sep 1 (2027) → Sep 6 (2028)
- Model = calendar TEMPLATE (permanent structure) + calendar INSTANCE per year (dates).
- Roll-over = generate next year's dated instance from the template, then cascade to booklists, schedule, subjects, clubs, enrichment, certs.

## 5b. The Calendar Follows FIXED MATH (dates computed, not guessed)
- Dates change yearly, but follow the SAME rule-set every year.
- year_N calendar = f(fixed rules, year_N anchors)
  * fixed rules = 36 weeks, holiday placement rules, 2 exam windows, Zone 3 Hour 0, season-mode DST logic
  * year_N anchors = year-start, Passover, DST switches, Cambridge, IB
- Generator is RULE-DRIVEN and reusable — not a fresh manual table.
- Every generated date traces to a governing rule (audit-log principle).

## 5c. Exam Windows Are DUAL BOARD ANCHORS (Cambridge + IB, yearly)
- Calendar caters to BOTH boards' actual exam periods each year.
- Both run two sittings/year; windows re-dated annually (computed):
  * Cambridge (IGCSE/A-Level): May–June (main) + Oct–Nov (secondary)
  * IB (Diploma): May (main) + November
- Exam dates = HARD external anchors (pre-published board schedules).
- Rule guarantees:
  * all 36 instructional weeks flow into the boards' windows
  * NO holiday intrudes on either board's assessment run-up
  * one shared frame serves Cambridge + IB students in the same intake, neither losing prep time

## 5d. Holiday Hardness Gradient (final, corrected)
- HARD — Year-end: ~4 wks over December, roughly mid-Dec → mid-Jan (≈15th–15th). Near-fixed, barely moves. Locked FIRST.
- HARD (external) — Passover: FIXED by Hebrew calendar (15 Nisan). Pre-known & locked years ahead; only its Gregorian date shifts. COMPUTED/derived, NOT guessed or adjustable.
- HARD (external) — Cambridge + IB windows: pre-published board dates.
- HARD (external) — DST switches: legislated, pre-known.
- SEMI-FIXED — Seasonal (late Oct, 1 wk): small yearly nudge (UK half-term).
- FLEX — Mid-year (Jun/Jul, ~3 wks): THE ONLY truly flexible break. Sole shock absorber; placed LAST to absorb slack.

## 6. year_N anchors (complete set — all HARD except Mid-year)
- Year-start date (grid anchor)
- Passover date (15 Nisan) (computed, hard external)
- DST switch dates (legislated, hard external)
- Cambridge exam dates (May–Jun + Oct–Nov, hard external)
- IB exam dates (May + Nov, hard external)
- Mid-year break (the ONLY flex lever)

## 7. Generator Solve Order
1. Lock/compute ALL hard anchors: Year-end (~15–15 Dec/Jan), Passover (15 Nisan), Cambridge, IB, DST.
2. Flex Mid-year (Jun/Jul) — the single soft break — to absorb slack so no hard anchor or board run-up ever breaks.
- Passover is COMPUTED, not entered. Mid-year is the only human/flex lever.

## 8. Formulae
- class identity = department + intake + stage + grade
- student schedule = master 36-week calendar + intake offset × zone render
- zone render = base offset + season-mode (DST) [anchor = UTC+2 fixed]
- session viability = teacher zone-roster ∩ students' renderable zones
- year_N calendar = f(fixed rules, year_N anchors)

## 9. Build Impact
- P2-011 (NOW): student → class (dept + intake + stage + grade); zone stored as student render attribute. UNCHANGED by this doc.
- Zone seed: use exact 5-zone table (region + offset + season behaviour).
- LATER — Calendar Generator: calendar TEMPLATE + per-year dated INSTANCE; rule-driven: year_N = f(fixed rules, year_N anchors); solve order: lock hard anchors, flex Mid-year; DST-aware zone render, Cape Town UTC+2 immovable Hour 0
- LATER — Teacher Roster: teacher → zone availability (which of 5 bands) → feeds session viability

## 10. Drift / Guard Notes
- CALENDAR IS ANNUAL: store as template + per-year dated instance. No date hardcoded as permanent.
- Passover COMPUTED from 15 Nisan — never manually entered.
- Mid-year (Jun/Jul) is the ONLY flexible break.
- Intake extensible (June not live yet) — never hardcode enum.
- All holiday/exam dates configurable on the per-year instance.

## 11. Calendar is TENANT-SCOPED (white-label ready)
- This entire spec describes REDHOUSE'S calendar instance (tenant #1, 00000000-0000-0000-0000-000000000001).
- Another white-label tenant may run a DIFFERENT schedule: different intakes, holidays, exam boards, and anchor zone.
- Split:
  * ENGINE (white-label, shared) = template + per-year instance, fixed math year_N = f(rules, anchors), solve order, DST season-mode.
  * CONFIG (per-tenant data) = intakes set, holiday list, exam boards, anchor zone (Hour 0), 36-week vs other length.
- All calendar tables MUST carry tenant_id and scope by it (like every other Redhouse table).
- Redhouse config = its OWN row(s). White-label = its own row(s).
- Mirrors product rule: LMS/Mobile/Devotional = white-label engine; tenant data fills them. Calendar is the same.

## Guard
- NEVER hardcode Jan/Sep, Passover, Cambridge/IB, or Cape Town anchor as global. They are REDHOUSE VALUES, not universal law.

## 12b. Slot length = class duration = teacher billing unit (TENANT-SCOPED, resolved by STAGE + DEPARTMENT/LEVEL)
- Redhouse slot lengths:
  * Junior school     = 30–45 min  (tentative)
  * Senior (general)  = 60 min     (set for now, can change)
  * A-Level Cambridge = 90 min     (specific override)
- Slot length is resolved by STAGE + DEPARTMENT/LEVEL, not stage alone. A-Level Cambridge overrides senior's 60 to 90. Maps to class identity department + intake + stage + grade — the department+stage pair decides duration.
- Slot length is the teacher billing input (see 12c). Session duration derives from class_session tstzrange.
- TENANT-SCOPED: Redhouse values above; other white-labels (e.g. Sentios) differ. ENGINE (slot concept + overlap law) = white-label; CONFIG (actual minutes per stage+department) = tenant data.
- Lives in a tenant-scoped slot_config keyed by tenant_id + stage + department (nullable = fallback), slot_minutes.
- Belongs to SCHEDULER layer (later). NOT P2-011 / 027.

## 12c. Teacher HOURS are the tracked truth (contract-agnostic)
- Track teacher HOURS = sum of session durations taught, per period.
- Do NOT hardcode a pay model. Contract shape is unknown (per-hour, salary, per-session — TBD).
- DB captures accurate HOURS (from class_session tstzrange duration); PAYROLL layer applies whatever the contract turns out to be.
- Hours = the truth; pay = an interpretation applied on top, later.

## 12d. A teacher can span MULTIPLE zones across the day
- Zones are timezone bands. A teacher's single continuous working day maps to DIFFERENT zone-labels by time of day (e.g. Teacher A morning serves Zone 1&2; Teacher B serves Zone 3&4). One teacher, one day, two zone-groups (morning vs afternoon).
- Teacher is NOT partitioned by zone. Zone is a RENDER/PLACEMENT attribute, NOT a per-teacher clock.
- Enforcement runs on ABSOLUTE TIME: no-double-booking (Section 12) still holds — a teacher can't teach two classes at the same absolute instant, but CAN serve different zones across the day.
- Lives in SCHEDULER/SESSION layer, keyed on absolute time. NOT 027.

## 12e. Dual display: device time + zone label (both, always)
- Every user sees the schedule in THEIR OWN DEVICE/LOCAL TIME (absolute UTC rendered in their IANA timezone) — the actionable clock.
- AND they see THEIR ZONE LABEL (band 1–5) as context — which cohort/band they are placed in.
- NOT either/or: device time = functional clock; zone = contextual badge.
- Rationale: device time → schedule is actionable, no mental math; zone label → context (why peers see different times; which group-level rollouts/social events apply).
- Surfaces on Home Page Section A alongside greeting, stage, intake group (zone = another identity/context chip). Calendar renders in device time.
- Consistent with: times stored UTC + rendered local; zone = render/placement attribute (now made VISIBLE to the user).
- Data source is profiles.zone (already in the 027 plan, render-only). Display concern → mobile/render layer. NOT P2-011 / migration 027.
