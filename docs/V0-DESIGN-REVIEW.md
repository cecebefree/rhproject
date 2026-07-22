# v0 Design Review

**Date:** 2026-07-22
**Ruling reference:** DF-32 PARTIAL RULING at c4f76f2
**Board item:** Item 31 — Verify design items against v0 links

## Review Basis Caveat

The live v0 deployment (https://v0-redhouse-dashboard-dso7s4mj2-cecebefree-3976s-projects.vercel.app)
is Vercel deployment-protection-walled and was not agent-accessible. This review used
the six frozen design-intent docs in `docs/design/` (05-my-groups.md, 06-family-variant.md,
07-teacher-variant.md, 08-report-card-tab.md, chat-adjustments.md, expo-port-plan.md)
and the v0 element register at `docs/design/v0-element-register.md` as proxy.

An optional owner walkthrough of the live v0 deployment is noted as follow-up to
confirm design-screen alignment beyond what the docs capture.

## Findings — 17 Scaffold Screens vs. 3 Criteria

| Screen | Visual Consistency | Structural Readiness | Scaffold Honesty | Severity | Note |
|--------|-------------------|---------------------|------------------|----------|------|
| index.tsx (Home) | Minor: `#fff` inline on greeting (navy bg), rest uses theme | Minor: devotional verse hardcoded; coming_up/news static text — would need full replacement for live data | Major: hardcoded verse + teacher name "Mr. Olivier" look like real data. No "scaffold" comment | minor | Verse is a real Bible quote — could be mistaken for live devotional feed |
| class.tsx | None — all theme | None — `.map()` over seed → cleanly replaceable; card fields match `student_class` schema | Minor: LIVE badge renders conditionally on seed data; clear comment header "Design 7 context" | none | Structurally ready for Phase E |
| hub.tsx | None — all theme | None — same pattern as class; `.map()` over seed hubs | Minor: same LIVE badge pattern | none | Structurally ready |
| social.tsx | None — all theme | Minor: no nav handler on card tap (deferred) | Minor: uses GroupCard with `lastMessage` from seed; clear scaffold intent | none | GroupCard reusable component verified |
| profile.tsx | None — all theme | Minor: quick links are text-only, no nav handlers | Minor: SEED_USER fields map directly to profiles columns — good | none | Ready; quick links need wiring |
| family.tsx | None — all theme | Major: ledger uses "sample" data — full replacement needed when lead table exists | Minor: "sample" labels are explicit; "Coming soon" note is honest | minor | `family_child` table BACKED but ledger is GAP-BACKEND |
| teacher.tsx | None — all theme | Minor: Switch is local state only, no backend persistence | None: clear "Group Lead controls" context | minor | Media-dial toggle needs backend column GAP-BACKEND |
| report-card.tsx | None — all theme | None — `.map()` over filtered seed; status filter `c.status === 'visible'` maps to real column | Minor: "Released cards only" subtitle is honest | none | Structurally ready |
| certificates.tsx | None — all theme | None — same card list pattern | Minor: SEED_CERTS map to real certificates schema | none | Structurally ready |
| group-chat.tsx | None — all theme | Major: full send UI (TextInput + button) but both are decorative — no actual send path. `sendState` is hardcoded idle | Minor: SEED_MESSAGES provide realistic sample chat | major | Needs structural rework for live chat; defers to Phase E per DF-32 |
| group-info.tsx | None — all theme | Major: `SEED_GROUPS[0]` — needs route param for real group. Member list hardcoded (Zoe Mitchell, Thomas Chen) | Major: hardcoded member names look like real people; `SEED_GROUPS[0]` unlabeled | minor | Route param injection needed; hardcoded member list is honest-enough demo data |
| class-detail.tsx | None — all theme | Minor: `SEED_CLASSES[0]` — needs route param | Minor: clear detail view, no fake data | none | Easy to wire with route params |
| hub-detail.tsx | None — all theme | Minor: `SEED_HUBS[0]` — needs route param | Minor: same as class-detail | none | Easy to wire |
| devotional.tsx | Not rated — 1-line delegate to DevotionalGate component | N/A — delegates entirely | N/A | none | Thin wrapper — component lives in `src/components/` |
| +not-found.tsx | Major: no theme imports, hardcoded `<View>` with inline `<Text>`, no StyleSheet, no colors | Minor: functional 404, but doesn't match app design language | None: clearly a fallback | minor | Should use theme for visual consistency; functional as-is |

## Verdict

**PASS-WITH-NOTES.** No screen requires structural rebuilding to accept Phase E data wiring.
Visual consistency is high (theme-driven, shared components). Two minor inconsistencies
(`+not-found.tsx` theming, `index.tsx` inline colors) are low-effort fixes.

## Follow-Up Items

1. **`+not-found.tsx` theming (minor).** Add StyleSheet, `colors.ivory` background, spacing,
   and theme typography. ~5 min task.

2. **Scaffold-marker comment for `index.tsx` hardcoded verse and teacher name (minor).**
   Add a `// SEED DATA — replace with live feed when devotional backend is wired` comment
   to prevent the hardcoded Bible quote and teacher name from being mistaken for live data.

3. **GroupChat structural rework (deferred to Phase E per DF-32).** The decorative send UI
   (TextInput + Send button, no-op) will need replacement, not extension, for live chat
   wiring. Gated behind DF-32 per the partial ruling.

4. **Family ledger (GAP-BACKEND schema blocker, outside DF-32 lane).** The ledger section
   uses honest "sample" labels, but the screen cannot be wired until lead/invoice/payment
   tables exist. This is a backend schema gap, not a routing or wiring blocker.
