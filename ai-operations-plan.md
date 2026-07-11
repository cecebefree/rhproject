# AI Operations Plan — Redhouse Business Management Layer
> STATUS: RULED / APPROVED — [date]
> AUTHORITY: Principal ruling, this document supersedes all prior AI-ops chat discussions
> ANCHOR: sits alongside tech-stack.md, best-practices.md, next-steps-plan.md

## 1. Doctrine (Non-Negotiable)
- Deterministic spine, intelligent skin: code executes consequences; agents draft, monitor, route, narrate.
- Agents propose, Edge Functions dispose. No agent writes a status, sends money, or commits externally.
- Chains stay short: max ~5 LLM steps before a deterministic checkpoint.
- No agent-to-agent negotiation swarms. Strategy = ONE weekly batch Analyst pipeline.
- No autonomous self-modification: prompt/SOP changes land as PRs merged by Principal only.
- Every agent action logs to the audit table BEFORE execution. Kill switch per agent.
- Human gates fire on four triggers only: legal (EU AI Act / KCSIE / GDPR-POPIA),
  money movement, child welfare, irreversible external commitment.

## 2. Stress-Test Verdicts (Evidence-Based)
- BUILD Phase 1: Inbound/Enquiry, Tier-1 Support.
- BUILD constrained: Admissions (drafter/mover only), Registrar (human approve→active),
  Report chasing (human authors final comments), Comms (drafts only).
- REDESIGN deterministic-first: Exam concierge (rules/cron + comms agent),
  Scheduling (constraint solver + comms wrapper), Compliance calendar.
- KILLED: Finance Agent as actor (deterministic ledger; agent = explainer only),
  L4 Leadership Council swarm (→ single Analyst pipeline),
  autonomous Self-Improvement (→ propose-only PRs).
- REBUILT standalone: Safeguarding = deterministic detection pipeline → real-time
  alert to named human DSL. Never an agent duty. Absolute human judgment.

## 3. Regulatory Overlay
- EU AI Act: admissions, assessment, employment = high-risk → human decision mandatory.
- KCSIE 2025 / DfE AI standards: disclosed monitoring, real-time DSL alerts,
  AI flags integrated into safeguarding process. OEAS evidence file maintained.
- UK GDPR / POPIA: DPIA before any pupil-data tool; consent recorded at capture;
  all pupil/family data in governed Supabase under RLS. No pupil data into
  generative models without contractual safeguards.
- JCQ: exam entries signed by human exams officer; concierge docs support
  candidate-work authentication.
- Compliance posture is a MOAT: provably governed, audited, DSL-integrated AI ops.

## 4. Departmental Operating Map
Legend: [AI] agent-run · [DET] deterministic system · [HUMAN] required gate

### Admissions & Sales
- [AI] 24/7 inbound response (5-region Global Desk), qualification/scoring, nurture drafting
- [DET] pipeline transitions (enquiry→qualified→invoiced) via Edge Functions;
  invoice issuance; payment→registration trigger
- [HUMAN] discovery calls, admission decisions
- Pipelines: Family Admissions (primary) · Teacher Recruitment (AI screens, human hires)
  · B2B Partners (human-led, AI briefs) · Commerce (RedEstore/LitG/Premlux flows)
- Guardrails: no cold outbound volume (domain-burn evidence); mixed-intent replies
  route to human; KPI = qualified conversations & enrolments, never volume.

### Registrar & Student Admin
- [AI] document assembly, completeness, chasing · [DET] state moves, retention rules
- [HUMAN] approve→active (always), withdrawal terms, exam entry sign-off (JCQ)
- Exam concierge: [DET] windows/codes/deadlines via rules tables + cron; [AI] parent comms

### Academic Operations
- [DET] timetabling = constraint solver; formative MCQ auto-marking
- [AI] schedule comms, report chasing, DRAFT school comments, quality signals
- [HUMAN] class cancellations, final comment authorship + release, summative grading,
  teacher judgment

### Finance
- [DET] ledger, reconciliation, statements, cost-plus billing runs (SA Pty)
- [AI] arrears/anomaly narration, budget-vs-actual reports (explainer only)
- [HUMAN] refunds, write-offs, fee adjustments, waterfall distributions,
  inter-entity transfers

### Marketing (9 specialists)
- Campaign Strategist · Content · SEO · Paid Media (read-only ad access) ·
  Social/Community · Lifecycle/Sequences · Analytics/Attribution ·
  Market Intelligence · Knowledge Curator/Self-Improvement (propose-only)
- Three-layer memory: task context / campaign episodic / brand long-term
- [HUMAN] campaign budgets, ad account changes, ALL public publishing
- Claims-check rule set before any publish gate (FTC/ASA + child-directed rules)
- Shadow mode 2–4 weeks before any autonomy; 90+ days clean data before
  trusting paid-media recommendations.

### Communications & Support
- [AI] Tier-1 support (disclosed as bot), announcement drafts
- [DET] transactional notifications
- [HUMAN] school-wide sends; mixed-intent/emotional replies (no AI emotional bonding)

### Safeguarding (standalone system)
- [DET] signal detection (disclosed monitoring) → real-time DSL alert routing
- [HUMAN] ALL judgment, contact, escalation — named DSL — jumps every queue

### Compliance & Governance
- [DET+AI] entity calendar (UK Ltd, SA Pty, 3 GBCs, Foundation), board packs,
  OEAS evidence, DPIA drafts
- [HUMAN] filings, signatures, legal wording (Principal + resident directors);
  quarterly AI-oversight review (audit table + kill-switch log)

### HR
- [AI] screening vs role specs, shortlists, onboarding chasing
- [HUMAN] interviews, hiring, contracts, discipline (AI Act high-risk)

### Strategy Office
- [AI] ONE weekly batch Analyst: funnel, revenue, capacity, churn, KPI narrative,
  ranked rulings queue
- [HUMAN] every ruling = Principal

## 5. Human-Required Registry (Exhaustive — 14 Gates)
1. Enrolment calls + admission decisions — advisor/Principal
2. Registration approve→active — Office Desk human
3. Exam entry sign-off — exams officer
4. Final report comments + release — teacher/head
5. Summative grading review — teacher
6. Class cancellations — School Desk human
7. Refunds/write-offs/distributions — Principal
8. Campaign budgets + ad account changes — Principal/delegate
9. Public publishing + school-wide sends — Principal/delegate
10. Safeguarding judgment — named DSL (ABSOLUTE)
11. Hiring/contracts/discipline — Principal/head
12. Filings/signatures/legal wording — Principal + directors
13. Prompt/SOP merges + quarterly AI audit — Principal; directors quarterly
14. Strategy rulings — Principal
Steady state: ~2–4 human FTE equivalents. Everything not listed = AI/deterministic.

## 6. HubSpot Removal Ruling
- HubSpot STRUCK from the stack (ToS/data-use incident = vendor-risk proof case).
- Pre-gate leads live NATIVELY in Supabase lead tables. No sync. No CRM boundary.
- Sales≠School boundary now RLS-enforced (Front Desk roles ↔ lead tables;
  School Desk roles ↔ registrations). One database, one authority, one audit trail.
- Attribution shortens: UTM → Supabase directly.
- Nurture: agents author versioned sequence DEFINITIONS (rows); deterministic
  scheduler sends; sequence changes human-approved before activation.

## 7. NEW BUILD ITEM — Owned Send Rail (~1 week, BEFORE marketing agents go live)
- Lead capture forms (Lovable) → lead tables with UTM fields
- Transactional + sequence sender (Resend/Postmark-class) behind Edge Function
- Own domain reputation: SPF/DKIM/DMARC health as scheduled check
- Consent + unsubscribe: POPIA/GDPR consent columns at capture, suppression list,
  honored at dispatch

## 8. Build Sequence (Amended)
1. Send rail + consent schema (new, ~1 wk)
2. Phase 1 agents: Inbound Response, Tier-1 Support (shadow mode first)
3. Qualification + Nurture agents on Supabase-native pipeline
4. Registrar/exam-concierge deterministic rails + comms agents
5. Marketing specialist roster (gated publishing)
6. Weekly Analyst pipeline
7. Safeguarding detection pipeline + DSL alerting (parallel track, before any
   pupil-facing surface ships)

## TODO (next sessions, one artifact each)
- [ ] send-rail.md — provider choice, schema, suppression design
- [ ] safeguarding-pipeline.md — detection rules, DSL routing, disclosure copy
- [ ] agent-registry.md — per-agent: scope, tools, kill switch, audit hooks
- [ ] gates.md — the 14 gates as implementable Edge Function checks
