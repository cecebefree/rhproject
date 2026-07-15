# Brand Assets — Redhouse Mobile

**Status:** PLACEHOLDER GRADE — approved by Cece 2026-07-15
**All items marked REPLACEABLE / TODO-FINAL until final assets delivered.**
**Visual references:** https://redhouse.lovable.app/ , https://v0-redhouse-dashboard-ui.vercel.app

---

## 1. Logo

**Treatment:** Text wordmark "Redhouse" (dummy — final logo pending)

| Asset | Spec | Status |
|-------|------|--------|
| Wordmark | "Redhouse" in system font, charcoal (#1c1c1e) on transparent | TODO-FINAL-LOGO |
| App icon | 1024x1024, wordmark on navy (#1a2330) background | TODO-FINAL-LOGO |
| Splash | Full-screen navy background, centered wordmark | TODO-FINAL-LOGO |

**Tagline (if needed):** "Ad astra · Anchored flexibility"

---

## 2. Color Tokens

**Seed values — open to change, treat as v1.**

### Base Palette

| Token | Hex | Role |
|-------|-----|------|
| navy | #1a2330 | Primary / dark surface |
| burgundy | #8b1a2e | Brand accent |
| champagne | #c9a227 | Secondary accent |
| ivory | #f8f7f4 | Light surface |
| charcoal | #1c1c1e | Text / neutral |

### Category Badge Colors (derived from base palette)

Derivation rules — a palette swap re-derives badges by applying these mixing ratios:

| Category | Rule | Hex | Derivation |
|----------|------|-----|------------|
| Core | = navy | #1a2330 | Direct base token |
| Enrichment | = burgundy | #8b1a2e | Direct base token |
| Club | = champagne | #c9a227 | Direct base token |
| School | = charcoal | #1c1c1e | Direct base token |
| Social | blend(navy, ivory, 0.70) | #5d636b | 70% navy + 30% ivory |
| Staff | blend(charcoal, ivory, 0.60) | #747474 | 60% charcoal + 40% ivory |
| Family | blend(burgundy, ivory, 0.65) | #b16773 | 65% burgundy + 35% ivory |

**Blend formula:** result = (ratio * base) + ((1 - ratio) * ivory), per channel, rounded to nearest integer.

### Extended Palette (derived)

| Token | Hex | Use |
|-------|-----|-----|
| navy-light | #2a3a4d | Card backgrounds on dark surface |
| burgundy-light | #a84560 | Hover states on burgundy |
| champagne-dark | #9a7a1a | Text on champagne backgrounds |
| ivory-dark | #e8e7e4 | Borders, dividers on ivory |
| charcoal-light | #3a3a3e | Secondary text |

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
| 1 | Wordmark logo | TODO-FINAL-LOGO | Placeholder: text "Redhouse" |
| 2 | App icon | TODO-FINAL-LOGO | Generate from wordmark on navy |
| 3 | Splash screen | TODO-FINAL-LOGO | Navy background, centered wordmark |
| 4 | Base palette (5 tokens) | REPLACEABLE | Seed values, open to change |
| 5 | Category badge colors (7) | REPLACEABLE | Derived from base palette |
| 6 | Typography | TODO-FINAL-TYPE | System font stack for demo |
| 7 | Naming constraints | DEFERRED | Field-register extension, later |
