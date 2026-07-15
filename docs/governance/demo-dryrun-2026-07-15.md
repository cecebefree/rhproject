# Demo Dry-Run — 2026-07-15

## Screen-by-Screen Verdict

| # | Screen | Design Section | Verdict | Note |
|---|--------|---------------|---------|------|
| 1 | HomeScreen (index.tsx) | Design 7 — Home tab | CONFORMS | greeting, devotional, coming_up, news — all present |
| 2 | ClassScreen (class.tsx) | Design 7 — Class tab | CONFORMS | enrolled classes list with subject/teacher/schedule/location/LIVE badge |
| 3 | HubScreen (hub.tsx) | Design 7 — Hub tab | CONFORMS | enrichment courses list with title/type/location/stage/LIVE badge |
| 4 | SocialScreen (social.tsx) | Design 5 + chat-adjustments | CONFORMS | My Groups list with GroupCard (name, category badge, lead) |
| 5 | GroupChatScreen (group-chat.tsx) | chat-adjustments | CONFORMS | messages with bubbles, input, send button; send state idle (static demo) |
| 6 | GroupInfoScreen (group-info.tsx) | chat-adjustments | CONFORMS | group name, category badge, lead, member count, media toggle, member list |
| 7 | ProfileScreen (profile.tsx) | Design 5 | CONFORMS | user info + My Groups mirror (read-only) + quick links |
| 8 | FamilyScreen (family.tsx) | Design 6 | CONFORMS | child tab, ledger (sample data with "coming soon"), groups |
| 9 | TeacherScreen (teacher.tsx) | Design 7 | CONFORMS | Lead badge, media toggle, My Groups with lead controls |
| 10 | ReportCardScreen (report-card.tsx) | Design 8 | CONFORMS | filters to visible cards only, status badge, released-only visibility |
| 11 | CertificatesScreen (certificates.tsx) | ITEM-002 | CONFORMS | certificate list with title, class, signatory, issuedAt, status |
| 12 | ClassDetailScreen (class-detail.tsx) | Design 7 (sub-screen) | CONFORMS | subject, LIVE badge, teacher, schedule, location |
| 13 | HubDetailScreen (hub-detail.tsx) | Design 7 (sub-screen) | CONFORMS | title, LIVE badge, type, location, stage |

**Summary:** 13/13 CONFORMS. No cosmetic drift or functional gaps found.

---

## Brand Check — Category Badge Distinguishability

### 7 Category Badge Colors

| Category | Hex | Visual | Distinguishable? |
|----------|-----|--------|------------------|
| Core | #1a2330 (navy) | Dark blue | YES — distinct dark blue |
| Enrichment | #8b1a2e (burgundy) | Dark red | YES — distinct dark red |
| Club | #c9a227 (champagne) | Gold | YES — distinct gold |
| School | #1c1c1e (charcoal) | Near-black | CAUTION — very close to Core navy |
| Social | #5d636b | Medium gray | CAUTION — close to Staff gray |
| Staff | #747474 | Medium gray | CAUTION — close to Social gray |
| Family | #b16773 | Muted rose | YES — distinct rose |

### Flagged Pairs

1. **Core (#1a2330) vs School (#1c1c1e):** Both very dark; on low-contrast screens or at small badge size, these may read as identical. Navy has a blue undertone; charcoal is neutral. Difference is subtle.

2. **Social (#5d636b) vs Staff (#747474):** Both medium grays. Social is slightly darker/cooler; Staff is slightly lighter/warmer. At badge size (8px padding, 2px vertical), the 19-point lightness gap may not be sufficient for quick scanning.

### Recommendation

When final brand assets arrive (D30), re-derive badge colors with higher inter-category contrast. The current placeholder palette was seeded for structure, not distinguishability.

---

## Wordmark / Navy Legibility

- **HomeScreen greeting:** White text on navy (#1a2330) background — legible, high contrast
- **ProfileScreen:** No navy background — charcoal text on ivory — legible
- **Nav bar:** Tab labels use charcoalLight on ivory — legible

No wordmark is rendered in the current seed (no logo image). The text Redhouse does not appear on-screen. Wordmark legibility cannot be assessed until D30 final assets are provided.

---

## Seed Check — Raw Placeholders

| Screen | Finding | Severity |
|--------|---------|----------|
| FamilyScreen | Ledger shows "(sample)" suffix on invoice/amount/status — intentional per Design 6 Option a | OK — by design |
| GroupChatScreen | TextInput placeholder "Type a message..." — standard UI pattern | OK — not a raw placeholder |
| HomeScreen | Devotional verse "John 10:10 TPT" — seed content | OK — not lorem/TODO |

**No raw placeholders found.** No lorem ipsum, no TODO strings, no empty arrays rendering as blank sections.

---

## Summary

- **13/13 screens CONFORM** to frozen designs
- **0 cosmetic drift**
- **0 functional gaps**
- **2 badge contrast flags** (Core/School, Social/Staff) — defer to D30
- **0 raw placeholders**
- **Wordmark legibility** — cannot assess without D30 assets

---

Auditor: Architect
Date: 2026-07-15
Status: DRY-RUN COMPLETE — awaiting Cece review
