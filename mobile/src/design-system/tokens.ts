import type { TextStyle } from 'react-native';

// The tokens of the team's design system "SNU Now", under its names. Light theme only: the design system has no dark
// theme. A component takes every colour, space, radius, size and text style from here.

export const color = {
  snuBlue: '#001A72',
  snuBluePressed: '#00114F',
  blue600: '#2A4BA8',
  blue100: '#DDE4F6',
  blue50: '#EEF2FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F5F6F9',
  surfaceSunken: '#ECEEF3',
  scrim: 'rgba(14, 19, 48, 0.40)',
  border: '#E2E5EC',
  borderStrong: '#858CA0',
  ink: '#0E1330',
  inkMuted: '#555C74',
  inkSubtle: '#8A90A3',
  onPrimary: '#FFFFFF',
  focusRing: '#3D63D6',
  me: '#2F6BFF',
  friend: '#177A4B',
  friendSoft: '#E3F3EA',
  party: '#B63A07',
  partySoft: '#FDEDE4',
  private: '#0E7383',
  privateSoft: '#E1F2F4',
  quest: '#865600',
  questSoft: '#FBF1D9',
  officialSoft: '#E6EAF5',
  live: '#0B7A55',
  danger: '#C42B2B',
  dangerSoft: '#FCE8E8',
  warning: '#9A5200',
  warningSoft: '#FDF1E0',
  svcDining: '#B8336A',
  svcDiningSoft: '#FBE7EF',
  svcShuttle: '#6B46C1',
  svcShuttleSoft: '#EFEAFB',
  svcStudy: '#0369A1',
  svcStudySoft: '#E3F1FA',
} as const;

// A 4-point grid. The key is the design system's step: space[4] is `space-4`, 16 points.
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

export const radius = { sm: 6, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const size = { touchMin: 48, button: 52, appBar: 56, bottomNav: 64, avatar: 40, pin: 36 } as const;

export const shadow = {
  card: '0 1px 2px rgba(14, 19, 48, 0.06), 0 1px 1px rgba(14, 19, 48, 0.04)',
  float: '0 4px 16px rgba(14, 19, 48, 0.14)',
  sheet: '0 -4px 24px rgba(14, 19, 48, 0.12)',
} as const;

// The translucent rings the design system's styles draw around a mark. Its token file gives them no names.
export const halo = {
  // Around the User's own position: the `me` colour at 16%.
  me: 'rgba(47, 107, 255, 0.16)',
  // Around the dot of Location Sharing that is on: the `live` colour at 18%.
  live: 'rgba(11, 122, 85, 0.18)',
  // Around a selected pin: the key colour at 18%.
  selected: 'rgba(0, 26, 114, 0.18)',
  // Under the round button of the main screen's bottom navigation: the key colour at 35%, as its frame draws it.
  raised: 'rgba(0, 26, 114, 0.35)',
} as const;

// Over a photo, as on the loading screen: white at the frame's strengths, and the shade that keeps it readable.
export const onPhoto = {
  textMuted: 'rgba(255, 255, 255, 0.85)',
  textSubtle: 'rgba(255, 255, 255, 0.8)',
  track: 'rgba(255, 255, 255, 0.25)',
  textShadow: 'rgba(0, 0, 0, 0.35)',
  scrim:
    'linear-gradient(rgba(0, 26, 114, 0.25) 0%, rgba(14, 19, 48, 0.05) 35%, rgba(14, 19, 48, 0.35) 65%, rgba(0, 16, 64, 0.85) 100%)',
} as const;

// One font file per weight, loaded under these names by the root layout. React Native picks a weight by the family's
// name, so a style sets fontFamily and never fontWeight.
export const font = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

// The eight text styles. A letter spacing is the design system's em value times the font size.
export const text = {
  display: { fontFamily: font.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.56 },
  titleLg: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.33 },
  title: { fontFamily: font.semiBold, fontSize: 18, lineHeight: 26, letterSpacing: -0.18 },
  bodyLg: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: font.semiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.11 },
} as const satisfies Record<string, TextStyle>;
