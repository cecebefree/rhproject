---
name: Monolith Precision
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#0057c0'
  on-secondary: '#ffffff'
  secondary-container: '#006ff0'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#aec6ff'
  on-secondary-fixed: '#001a43'
  on-secondary-fixed-variant: '#004397'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  geist-blue: '#0070F3'
  border-subtle: '#EAEAEA'
  background-dark: '#000000'
  foreground-dark: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1200px
---

## Brand & Style

The design system is rooted in the "Geist" aesthetic—a high-performance, developer-centric visual language characterized by absolute precision and extreme minimalism. It targets power users who value information density and functional clarity over decorative flair. 

The style is a hybrid of **Minimalism** and **Vercel-inspired Corporate Modernism**. It utilizes a strict grayscale palette to establish a neutral foundation, allowing data and high-contrast accents to drive user attention. The emotional response is one of surgical efficiency, technical sophistication, and architectural stability. Expect heavy use of whitespace, razor-sharp borders, and a systematic approach to interface depth.

## Colors

The palette is essentially monochrome, relying on `#000000` and `#FFFFFF` for primary structural elements. In light mode, `#FAFAFA` serves as the secondary background to differentiate between the canvas and container surfaces. 

The secondary color, `#0070F3` (Geist Blue), is reserved strictly for interactive highlights, primary actions, and focused states. To maintain the minimalist aesthetic, avoid using blue for large surface areas. Neutral grays should be derived from the black-to-white spectrum without warm or cool tinting to preserve the "technical" feel. For dark mode implementations, invert the logic: backgrounds become `#000000` and primary text becomes `#FFFFFF`.

## Typography

This design system uses **Geist** as the primary typeface to achieve a clean, technical appearance. Tight letter-spacing is applied to larger headlines to create a compact, modern feel.

**JetBrains Mono** is introduced as a secondary utility font for metadata, labels, and technical values to reinforce the "dashboard" and "developer-tool" personality. Line heights are kept tight but functional, favoring a denser information architecture. For mobile, headline sizes scale down significantly to prevent awkward word wrapping while maintaining the bold weight.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop, centering content within a 1200px container to ensure readability across ultrawide monitors. On smaller viewports, the grid transitions to a **Fluid** model.

Spacing is based on a strict **4px baseline**. Most components should utilize 16px (base * 4) for internal padding and gutters to maintain a rigorous sense of alignment. Margins for page containers are set at 32px for desktop and 16px for mobile. Hierarchy is established through the "squish" technique: buttons and inputs have smaller vertical padding relative to their horizontal padding (e.g., 8px top/bottom, 12px left/right).

## Elevation & Depth

This system shuns traditional ambient shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**. 

Depth is communicated through subtle shifts in background color (e.g., a white card on a `#FAFAFA` background) and 1px borders using `#EAEAEA` or `#D1D1D1`. When an element is focused or elevated, a high-contrast 1px black border or a very sharp, minimal shadow (0px 2px 4px rgba(0,0,0,0.05)) is used. Glassmorphism is permitted only for navigation bars or overlays, using a heavy backdrop blur (20px) and a semi-transparent white or black fill.

## Shapes

The shape language is "Soft" but disciplined. Elements like buttons, inputs, and cards use a consistent `0.25rem` (4px) corner radius. This provides a modern touch without sacrificing the "industrial" precision of the design. Large containers and modal windows may scale up to `0.5rem` (8px) for `rounded-lg` treatments, but circular or pill-shaped elements should be avoided unless used for status indicators or notification badges.

## Components

- **Buttons**: Use a solid black background with white text for primary actions. Secondary actions use a white background with a 1px `#EAEAEA` border. The hover state for secondary buttons should be a subtle shift to `#FAFAFA`.
- **Inputs**: Use a 1px border. On focus, the border color changes to `#000000` or `#0070F3`. There are no inner shadows.
- **Cards**: Flat white background, 1px border in `#EAEAEA`. No shadow by default. On hover, the border can darken slightly to `#D1D1D1`.
- **Chips/Badges**: Small, uppercase text using JetBrains Mono. Neutral badges use a light gray background; "success" or "error" states use high-saturation colors but with a very light background tint.
- **Lists**: Clean rows separated by 1px horizontal dividers. Use chevron icons (20px) for navigation cues.
- **Navigation**: Sidebar or top-nav should use a semi-transparent background with a 1px border separating it from the main content. Active links are indicated by a bold font weight or a left-side 2px accent bar in `#000000`.