// Design system tokens — stitch monolith precision palette

export const colors = {
  // Primary palette
  navy: '#273946',
  burgundy: '#C8281E',
  champagne: '#E8A020',
  ivory: '#F8F7F4',
  charcoal: '#1c1c1e',

  // Extended palette
  navyLight: '#3b5163',
  burgundyLight: '#d94f43',
  champagneDark: '#c88a1a',
  ivoryDark: '#EAEAEA',
  charcoalLight: '#4c4546',

  // Semantic
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
} as const;

// Category badge colors
export const categoryColors = {
  core: colors.navy,
  enrichment: colors.navy,
  club: colors.champagne,
  school: colors.charcoal,
  social: '#5d636b',
  staff: '#747474',
  family: '#b16773',
} as const;

export type CategoryKey = keyof typeof categoryColors;
