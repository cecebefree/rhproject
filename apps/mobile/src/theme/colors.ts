// Brand tokens from docs/brand-assets.md (PLACEHOLDER GRADE)
// Palette swap re-derives badge colors via blend formula below.

export const colors = {
  // Base palette
  navy: '#1a2330',
  burgundy: '#8b1a2e',
  champagne: '#c9a227',
  ivory: '#f8f7f4',
  charcoal: '#1c1c1e',

  // Extended palette
  navyLight: '#2a3a4d',
  burgundyLight: '#a84560',
  champagneDark: '#9a7a1a',
  ivoryDark: '#e8e7e4',
  charcoalLight: '#3a3a3e',

  // Semantic
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
} as const;

// Category badge colors — derived from base palette
// Derivation: result = (ratio * base) + ((1 - ratio) * ivory), per channel
// A palette swap re-derives all 7 via these mixing ratios.
export const categoryColors = {
  core: colors.navy, // Direct base token
  enrichment: colors.burgundy, // Direct base token
  club: colors.champagne, // Direct base token
  school: colors.charcoal, // Direct base token
  social: '#5d636b', // blend(navy, ivory, 0.70)
  staff: '#747474', // blend(charcoal, ivory, 0.60)
  family: '#b16773', // blend(burgundy, ivory, 0.65)
} as const;

export type CategoryKey = keyof typeof categoryColors;
