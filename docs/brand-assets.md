# Brand Assets — Redhouse

**Status:** ACTIVE — Cece approved hex codes 2026-09-05; favicon + icons generated from logo.
**Visual references:** https://redhouse.lovable.app/ , https://v0-redhouse-dashboard-ui.vercel.app

---

## 1. Logo

| Asset | Spec | Status |
|-------|------|--------|
| Wordmark | Redhouse logo (house + globe) | ACTIVE — `apps/web/public/redhouse-logo.png` (180x180) |
| Favicon | Multi-size ICO (16/32/48) | ACTIVE — `apps/web/public/favicon.ico` |
| App icon | 192x192 PNG | ACTIVE — `apps/web/public/icon-192.png` |
| PWA icon | 512x512 PNG | ACTIVE — `apps/web/public/icon-512.png` |
| Apple touch | 180x180 PNG | ACTIVE — `apps/web/public/apple-touch-icon.png` |

**Tagline:** "Ad astra · Anchored flexibility"

---

## 2. Color Tokens

**Approved by Cece 2026-09-05.**

### Brand Chromatics

| Token | Hex | Role |
|-------|-----|------|
| navy | #273946 | Primary / dark surface |
| gold | #E8A020 | Active / accent |
| red | #C8281E | Alerts / badges |
| cream | #F8F7F4 | Base / canvas |
| clean-white | #FFFFFF | Base / surface |

### Category Badge Colors (derived from base palette)

Derivation rules — a palette swap re-derives badges by applying these mixing ratios:

| Category | Rule | Hex | Derivation |
|----------|------|-----|------------|
| Core | = navy | #273946 | Direct base token |
| Enrichment | = red | #C8281E | Direct base token |
| Club | = gold | #E8A020 | Direct base token |
| School | = charcoal | #1c1c1e | Direct base token |
| Social | blend(navy, cream, 0.70) | #5d636b | 70% navy + 30% cream |
| Staff | blend(charcoal, cream, 0.60) | #747474 | 60% charcoal + 40% cream |
| Family | blend(red, cream, 0.65) | #b16773 | 65% red + 35% cream |

**Blend formula:** result = (ratio * base) + ((1 - ratio) * cream), per channel, rounded to nearest integer.

### Extended Palette (derived)

| Token | Hex | Use |
|-------|-----|-----|
| navy-light | #3a5060 | Card backgrounds on dark surface |
| gold-dark | #c08018 | Text on gold backgrounds |
| red-light | #e04030 | Hover states on red |
| cream-dark | #e8e7e4 | Borders, dividers on cream |

---

## 3. Typography

**System font stack for demo (SF Pro on iOS, Roboto on Android).**

| Element | Font | Weight | Size |
|---------|------|--------|------|
| H1 | System | Bold | 28px |
| H2 | System | Semibold | 22px |
| H3 | System | Medium | 18px |
| Body | System | Regular | 16px |
| Caption | System | Regular | 13px |
| Badge | System | Medium | 12px |

**Status:** TODO-FINAL-TYPE — final typeface TBD.

---

## 4. Naming Constraints

Deferred — governed later via field-register extension to mobile surfaces. Not an input here.

---

## Asset Register

| # | Asset | Status | Notes |
|---|-------|--------|-------|
| 1 | Wordmark logo | ACTIVE | `apps/web/public/redhouse-logo.png` (180x180) |
| 2 | Favicon | ACTIVE | `apps/web/public/favicon.ico` (16/32/48) |
| 3 | App icon | ACTIVE | `apps/web/public/icon-192.png` |
| 4 | PWA icon | ACTIVE | `apps/web/public/icon-512.png` |
| 5 | Apple touch icon | ACTIVE | `apps/web/public/apple-touch-icon.png` |
| 6 | Base palette (5 tokens) | ACTIVE | Cece approved 2026-09-05 |
| 7 | Category badge colors (7) | ACTIVE | Derived from base palette |
| 8 | Typography | TODO-FINAL-TYPE | System font stack for demo |
| 9 | Naming constraints | DEFERRED | Field-register extension, later |
