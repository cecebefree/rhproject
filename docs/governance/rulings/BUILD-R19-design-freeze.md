# BUILD-BOARD RULING 19 — DESIGN FREEZE

**Status:** Sealed — 2026-07-13
**Freeze granted at:** 8d7ae52

---

## Frozen Surface

The following screens and components are frozen as of commit 8d7ae52.
No screen changes may exceed this point without a numbered defect
or new ruling.

### Tab screens (5)
1. **Home** — root index
2. **Social (My Groups)** — group list, lead badge, mute, leave, group info view
3. **Family** — per-child ledger (fees, invoices, payments, balance, Records link)
4. **Teacher** — class roster, group lead badge, inert media toggle (default OFF)
5. **Profile** — identity card (name, handle, RH number) + My Groups read-only mirror

### Supplementary screens
- **Report Card** — three-state lifecycle (draft/released/visible)
- **Devotional** — gated stub (defaults false)

### Components
- **chat-ui.tsx** — G1 send states, G2 reconnecting banner, G3 empty states, G4 group info view

### Binding trims (T1–T3)
- No DM entry point
- No "+ Join" affordance
- Zero read receipts

---

## Scope Notes

- Chat content view (per-group message list) is NOT frozen — it is
  post-demo scope and will be designed when Realtime wiring begins.
- Tab ordering and labels ARE frozen.
- Styling refinements (colours, spacing, typography) are permitted
  without a defect filing as long as layout and content are unchanged.

---

Signed: Cece — final human gate. 2026-07-13.
