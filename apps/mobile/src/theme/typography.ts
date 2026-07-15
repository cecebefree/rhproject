// System font stack for demo (SF on iOS, Roboto on Android)
// TODO-FINAL-TYPE — final typeface TBD

import { Platform } from 'react-native';

const fontFamily = Platform.OS === 'ios' ? 'System' : 'Roboto';

export const typography = {
  fontFamily,
  sizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 16,
    caption: 13,
    badge: 12,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;
