# Master TODO -- Single Active Plan

Supersedes task tables in next-steps-plan.md. All lead verdicts cite item numbers from this file.

| # | Item | Track | Operator | Depends On | Status |
|---|------|-------|----------|------------|--------|
| 1 | ai-operations-plan.md committed + tech-stack.md reconciled (47440ad, 15d4abb) | Governance | - | - | DONE |
| 2 | Council-line audit - swarm council demoted to historical reference | Governance | - | 1 | DONE |
| 3 | Rogue .git + graveyard eliminated; launch rule bound to live repo | Governance | - | - | DONE |
| 4 | Authority grep: confirm Cece OK-to-build gate explicit in doctrine | Governance | CECE | 1 | Pending |
| 5 | Add P2-026 to .swarm/deferred.md; sweep register (D26 fires; review D1, D3, D16-D19) | Housekeeping | AI | - | Pending |
| 6 | Verify old Vite screens deleted (git show --stat) | Housekeeping | AI | - | Pending |
| 7 | Commit Mobile phase plan (consumes registration spec) | Planning | AI | - | Pending |
| 8 | Record d64bb05 ruling in governance notes | Governance | AI | - | Pending |
| 9 | iOS backend doc (ios-backend.md) - carried task | Docs | AI | 1 | Pending |
| 10 | RULING: group chat - mock vs minimal Realtime | Ruling | CECE | - | Blocks #40 |
| 11 | RULING: certificates - mock vs Supabase Storage bucket | Ruling | CECE | - | Blocks #41 |
| 12 | RULING: report card demo depth - seeded vs live write-release | Ruling | CECE | - | Blocks #55 |
| 13 | ASSET: Redhouse brand hex codes + logos | Asset | CECE | - | Blocks all UI |
| 14 | ASSET: Supabase URL + anon key | Asset | CECE | - | Blocks all wiring |
| 15 | ASSET: Cloudflare domain credentials | Asset | CECE | - | Blocks site go-live |
| 16 | ASSET: Android surface details | Asset | CECE | - | Blocks Android build |
| 17 | Design: My Groups block on Profile screen | Design | AI | - | Pending |
| 18 | Design: family profile variant - ledger (fees, invoices, payments, balance) + per-child Records | Design | AI | - | Pending |
| 19 | Design: teacher profile variant - content swap, classes taught | Design | AI | - | Pending |
| 20 | Design: Records to Report Card tab states (empty / released / detail) | Design | AI | - | Pending |
| 21 | DESIGN FREEZE - no further screen changes | HARD GATE | CECE | 17-20 | Pending |
| 22 | Expo port: Index/Home screen from v0 design | Port | AI | 21 | Pending |
| 23 | Expo port: Classes list screen | Port | AI | 21 | Pending |
| 24 | Expo port: Class detail screen | Port | AI | 21 | Pending |
| 25 | Expo port: Hub screen | Port | AI | 21 | Pending |
| 26 | Expo port: Profile screen (all variants: student/family/teacher) | Port | AI | 21 | Pending |
| 27 | Apply brand tokens (hex, logos) across all ported screens | Port | AI | 13, 22-26 | Pending |
| 28 | Extract shared UI package (components, theme) to packages/shared | Port | AI | 27 | Pending |
| 29 | AO-000: Edge Function scaffolding - create supabase/functions/ + establish pattern | Backend | AI | 14 | Pending |
| 30 | Migration 042: consent + suppression schema (send rail base) | Backend | AI | - | Pending |
| 31 | Migration 043: report-card release + certificates tables | Backend | AI | 12 | Pending |
| 32 | Edge Functions: Office Desk registration status mutations | Backend | AI | 29 | Pending |
| 33 | Edge Functions: gate contracts v1 (MVP subset of the 14) | Backend | AI | 29 | Pending |
| 34 | RLS policies for new tables (042/043) | Backend | AI | 30, 31 | Pending |
| 35 | Seed data: demo families, teachers, classes, ledger entries | Backend | AI | 34 | Pending |
| 36 | Wire Home/Index to Supabase | Wiring | AI | 14, 22, 35 | Pending |
| 37 | Wire Classes list + Class detail | Wiring | AI | 23, 24, 35 | Pending |
| 38 | Wire Profile - student variant | Wiring | AI | 26, 35 | Pending |
| 39 | Wire family profile - ledger + per-child Records | Wiring | AI | 18, 26, 35 | Pending |
| 40 | Group chat build - mock vs minimal Realtime | Wiring | AI | 10, 25 | Blocked by #10 |
| 41 | Certificates build - mock vs Supabase Storage bucket | Wiring | AI | 11, 31 | Blocked by #11 |
| 42 | Wire teacher profile variant | Wiring | AI | 19, 26, 35 | Pending |
| 43 | Wire Records to Report Card tab (empty/released/detail states) | Wiring | AI | 20, 31 | Pending |
| 44 | Wire Hub + Social feed | Wiring | AI | 25, 35 | Pending |
| 45 | Lovable website: intake forms to leads tables (Front Desk zone) | Website | AI | 14 | Pending |
| 46 | Front Desk console - leads pipeline (enquiry/qualified/invoiced) | Desks | AI | 45 | Pending |
| 47 | Office Desk console - registration statuses via Edge Functions only | Desks | AI | 32 | Pending |
| 48 | School Desk console | Desks | AI | 35 | Pending |
| 49 | Cloudflare deploy of website | Website | SYS | 15, 45 | Pending |
| 50 | AO-001 send-rail.md - design doc | Ops Docs | AI | 29 | Pending |
| 51 | AO-002 safeguarding-pipeline.md - design doc | Ops Docs | AI | - | Pending |
| 52 | AO-003 agent-registry.md - design doc (resequenced after AO-001 per PM) | Ops Docs | AI | 50 | Pending |
| 53 | AO-004 gates.md - 14 gates as Edge Function contracts | Ops Docs | AI | 50-52 | Pending |
| 54 | Gate 15 amendment: Build-start authorization (Cece) to doctrine section 5 | Governance | HUMAN | 4 | Pending |
| 55 | Report card demo - seeded vs live write-release path | Demo | AI | 12, 43 | Blocked by #12 |
| 56 | FIELD-REGISTER LOCK - no new fields/tables past this point | HARD GATE | CECE | 30-35 | Pending |
| 57 | QA: adversarial RLS pass + extend 152-test pgTAP baseline | QA | AI | 34, 56 | Pending |
| 58 | End-to-end demo walkthrough + leadership sign-off | Demo | HUMAN | 36-55, 57 | Pending |

## Closed Items (per PM verdict, accepted by Cece)

| Item | Disposition | Source |
|------|-------------|--------|
| P2-009 COPPA/FERPA | CLOSED - WON'T DO (out of scope for MVP; UK Children's Code + UK GDPR only) | session-handoff 07-06 |
| P2-021 File upload | Bumped LOW to MEDIUM priority (gates social posts, certificates, enrichment materials) | PM verdict |

## Lead Verdict Register

*To be filled sequentially by each lead: PM, CTO, Backend, Frontend, QA, Security, Governance.*
