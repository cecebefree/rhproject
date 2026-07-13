# DEFECT-001 — Chat: BUILD over BUY

**Filed:** 2026-07-13
**Affected Item:** ITEM-001 (group chat)
**Supersedes:** Section 1 and Section 5 of ITEM-001; original Phase C scope delta

---

## Evidence

Cost/scale/architecture analysis. The provider path adds:
  - A children's-data processor (DPIA scope expansion)
  - A membership sync pipeline (chat_identities, provider API mirroring)
  - A recurring per-user cost line

All ruled requirements (derived contacts, My Groups access,
differential DM permissions, handle search) are spine-data features
better served natively. The provider adds complexity without
architectural necessity.

## Ruling

Section 1 of ITEM-001 is **REPLACED** in full. Chat is **BUILT** on
Supabase Realtime (Broadcast + Presence), already in-stack.

For the full amended architecture, engineering conditions, conversation
controls, message types, handle doctrine, avatar unification, and
consolidated Phase C scope delta — see the consolidated ruling at
rulings/ITEM-001-chat.md.

## Compliance Effect

NO new children's-data processor. DPIA (item 14) scope simplified.
Vendor selection criteria and DPA requirements are moot.

---

Signed: Cece -- final human gate. 2026-07-13.
