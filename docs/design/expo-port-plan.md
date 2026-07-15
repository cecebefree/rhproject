# Expo Port Plan — Item 24

**Status:** PROPOSAL — awaiting Cece approval before code
**Frozen designs:** 5–8 + chat (commit 4197525)
**Brand assets:** Placeholder grade (docs/brand-assets.md)
**Blocked on:** D1 (react-native-screens version), D19 (Expo bootstrap fix)

---

## 1. Structure

```
apps/mobile/
  App.tsx                    # Entry point (fix D19: AppRegistry, not createRoot)
  src/
    navigation/
      RootNavigator.tsx      # Bottom tab navigator (5 tabs)
      types.ts               # Navigation param types
    screens/
      home/
        HomeScreen.tsx       # Design 5 context: greeting, devotional, coming_up
      class/
        ClassScreen.tsx      # Design 7 context: enrolled/teaching classes
      hub/
        HubScreen.tsx        # Design 7 context: enrichment courses
      social/
        SocialScreen.tsx     # My Groups list + chat entry
        GroupChatScreen.tsx  # Chat view (per ITEM-001)
        GroupInfoScreen.tsx  # Chat adjustments: group info view
      profile/
        ProfileScreen.tsx    # Design 5: My Groups mirror + user info
        FamilyScreen.tsx     # Design 6: Family variant (per-child tabs)
        TeacherScreen.tsx    # Design 7: Teacher variant (lead controls)
        ReportCardScreen.tsx # Design 8: Status chain + released-only
        CertificatesScreen.tsx # ITEM-002: Records tab
    components/
      GroupCard.tsx          # Reusable: avatar + name + badge + lead
      Badge.tsx              # Category badge (7 colors from palette)
      EmptyState.tsx         # Reusable: per-screen empty messages
      StatusDot.tsx          # Connection state indicator
      SendButton.tsx         # Chat send with states (idle/sending/sent/failed)
    theme/
      colors.ts              # Brand tokens (from docs/brand-assets.md)
      typography.ts          # System font stack
      spacing.ts             # Layout constants
    seed/
      groups.ts              # 3 seed groups (Culinary, Grade 8A, Entrepreneurs)
      cards.ts               # 1 seed report card (status: visible)
      certs.ts               # 1 seed certificate (Enrichment class)
      user.ts                # Seed user profile (Liam, student)
    api/
      supabase.ts            # Supabase client init
      queries.ts             # Shared queries (profile, groups, cards)
    utils/
      format.ts              # Date/time formatting
```

## 2. Screens (Phase 1 — frozen designs)

| # | Screen | Design | Key fields | Seed dependency |
|---|--------|--------|------------|-----------------|
| 1 | HomeScreen | Design 5 | greeting, devotional, coming_up | Static (no DB) |
| 2 | ClassScreen | Design 7 | class_subject, class_teacher, class_status_time | student_class (PLANNED) |
| 3 | HubScreen | Design 7 | hub_title, hub_type_meta, hub_status_time | courses (PLANNED) |
| 4 | SocialScreen | Design 5+6 | group_name, group_type, group_last_message | conversations (PLANNED) |
| 5 | GroupChatScreen | Chat | chat_sender_name, chat_message, chat_timestamp | messages (PLANNED) |
| 6 | GroupInfoScreen | Chat | member list, category badge, media-dial | conversation_members (PLANNED) |
| 7 | ProfileScreen | Design 5 | full_name, role_curriculum_year, My Groups mirror | profiles (BACKED) |
| 8 | FamilyScreen | Design 6 | child_name, ledger (PLANNED), per-child tabs | family_student_link (PLANNED) |
| 9 | TeacherScreen | Design 7 | Group Lead controls, class roster | conversation_members (PLANNED) |
| 10 | ReportCardScreen | Design 8 | status chain (draft/released/visible) | report_cards (BACKED) |
| 11 | CertificatesScreen | ITEM-002 | cert_class, title, status | certificates (BACKED) |

## 3. Seed Strategy

**Rule:** PLANNED fields render from seed only. No schema invention. No silent design edits (freeze in effect).

### Seed data structure

```typescript
// src/seed/groups.ts
export const SEED_GROUPS = [
  { name: "Culinary Club", category: "club", lead: "Chef Tanaka" },
  { name: "Grade 8A Class", category: "core", lead: "Mr. Olivier" },
  { name: "Entrepreneurs Club", category: "club", lead: "Mr. Steyn" },
];

// src/seed/cards.ts
export const SEED_CARD = {
  term: "Term 1 2026",
  subject: "Mathematics",
  grade: "A",
  status: "visible",  // terminal state — learner sees immediately
  student: "Liam van der Berg",
};

// src/seed/certs.ts
export const SEED_CERT = {
  class: "enrichment",
  title: "Finance 101 — Module 3 Completion",
  status: "issued",
  signatory: "Mr. Olivier",
};
```

### Seed rendering rules

| Field type | Source | Render method |
|------------|--------|---------------|
| BACKED fields | live query (profiles, report_cards, certificates) | Supabase client query |
| PLANNED fields | seed data (groups, cards, certs) | Static import, displayed as-is |
| COMPUTED fields | client-side derivation | Derived from BACKED + seed at render time |

### Seed-to-live transition

When PLANNED tables are migrated (D26, D28):
1. Remove seed import
2. Replace with Supabase query
3. Verify against frozen design (no visual regression)
4. Commit with migration reference

## 4. Pre-requisites (must fix before Expo bootstrap)

| # | Item | Fix | Blocks |
|---|------|-----|--------|
| D1 | react-native-screens version | Pin to ~3.x compatible with Expo 51 / RN 0.74 | First build |
| D19 | Expo bootstrap (createRoot → AppRegistry) | Rewrite apps/mobile/src/index.tsx | First render |
| D5 | Expo package.json | Clean web-based source deps | Install |

## 5. Build order

1. Fix D1, D19, D5 (pre-requisites)
2. Scaffold navigation + theme (no screens yet)
3. Seed data files (groups, cards, certs, user)
4. ProfileScreen (mostly BACKED — profiles table)
5. ReportCardScreen + CertificatesScreen (BACKED tables)
6. SocialScreen + GroupChatScreen + GroupInfoScreen (PLANNED — seed)
7. HomeScreen + ClassScreen + HubScreen (PLANNED — seed)
8. FamilyScreen + TeacherScreen (PLANNED — seed)
9. Wire brand tokens (colors, typography)
10. Verify against frozen designs — visual regression check

## 6. Hard rules

- PLANNED fields render from seed only — no schema invention
- No silent design edits — freeze in effect (ITEM-009)
- No DMs, no unruled features (R16, ITEM-001)
- Report Card status chain 1:1 mapping (Design 8)
- Chat states: Idle, Sending, Sent, Failed only (no Delivered — D29)
- Brand assets placeholder grade — TODO-FINAL-LOGO, TODO-FINAL-TYPE
