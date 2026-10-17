/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

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
  // The frames' faint words of an empty list, such as "결과 없음".
  inkFaint: '#858CA0',
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
  // Above the main screen's bottom navigation, as the `Main` frame draws it: the sheet's shadow, lighter.
  nav: '0 -4px 24px rgba(14, 19, 48, 0.08)',
  // Under a card that floats over the map, as the `Main` frame draws it: the floating shadow, darker.
  mapCard: '0 4px 16px rgba(14, 19, 48, 0.18)',
  // Under a person's marker on the map, as the `Main` frame draws it: 3 down. The marker's fill is turned by 45°
  // and its shadow with it, so the offset is given against the turn.
  markerTurned: '-2px 2px 4px rgba(14, 19, 48, 0.35)',
  // Under the name below a marker on the map, as the `Main` frame draws it.
  mapName: '0 1px 3px rgba(14, 19, 48, 0.25)',
  // Under a place's dot on the map.
  dot: '0 1px 4px rgba(14, 19, 48, 0.35)',
  // Under the round action in the middle of the main screen's bottom navigation, in the key colour, as the `Main`
  // frame draws it.
  navAction: '0 4px 12px rgba(0, 26, 114, 0.28)',
  // Around a small mark that sits on the map itself, as the `Main` frame draws it: the dot of a Friend's row and the
  // round of a Quest's row. A white ring of 2 over a soft shadow.
  mapMark: '0 0 0 2px #FFFFFF, 0 1px 4px rgba(14, 19, 48, 0.25)',
  // Around the rail that joins the Quest list's rows, as the `Main` frame draws it: a white ring of 1.5.
  mapRail: '0 0 0 1.5px #FFFFFF',
  // Around a small face that overlaps its neighbour, as on "오늘의 발자국": a white ring of 2.
  faceRing: '0 0 0 2px #FFFFFF',
  // Under a floating button in the key colour, as the `Main` frame draws "활성 파티": the floating shadow, darker.
  floatKey: '0 4px 16px rgba(14, 19, 48, 0.24)',
} as const;

// The translucent rings the design system's styles draw around a mark. Its token file gives them no names.
export const halo = {
  // Around the User's own position: the `me` colour at 16%.
  me: 'rgba(47, 107, 255, 0.16)',
  // Around the dot of Location Sharing that is on: the `live` colour at 18%.
  live: 'rgba(11, 122, 85, 0.18)',
  // Around a selected pin: the key colour at 18%.
  selected: 'rgba(0, 26, 114, 0.18)',
  // Around a selected dot, as the `Main` frame draws it: the key colour at 25%.
  selectedDot: 'rgba(0, 26, 114, 0.25)',
} as const;

// The colour that says what a person is doing: a status's dot on an Avatar, a row's dot in the friend list and the
// fill of a person's marker on the map. `member` is a member of the User's Party who is not a Friend.
export const presence = {
  free: color.live,
  class: color.snuBlue,
  moving: color.warning,
  off: color.inkSubtle,
  member: color.party,
} as const;

// The colour of a row of the main screen's Quest list, which its round, its kicker and its icon share, as the `Main`
// frame draws them: a class in the muted ink; `open`, a Party that others may join, in a blue that no token of the
// design system names; `closed`, a Party that takes nobody else and a Shared Quest, in the Party's colour.
export const questTone = {
  class: color.inkMuted,
  open: '#2F6FC0',
  closed: color.party,
} as const;

// The colours of a class in the timetable, by its place in it, as the `Profile` frame draws the week: the first class
// navy, the eighth navy again.
export const classColors = ['#001A72', '#0E7383', '#865600', '#6B46C1', '#B8336A', '#0369A1', '#4D7C0F'] as const;

// The rounds of 알림's rows, as the `Profile` frame draws them: an icon on its tinted ground. `navy` for a Party
// opened and a Friend Request, `invitation` for an invitation to 파티, and `request` for requests to join.
export const noticeTone = {
  navy: { ink: color.snuBlue, ground: color.blue50 },
  invitation: { ink: color.quest, ground: '#FFF4D6' },
  request: { ink: color.party, ground: color.partySoft },
} as const;

// On a fill of the key colour, as the `Main` frame draws "활성 파티": the dot that says the Party is live, the ring
// around it, and the second line's white at 85%.
export const onKey = {
  live: '#5FE0A8',
  liveRing: 'rgba(95, 224, 168, 0.28)',
  textMuted: 'rgba(255, 255, 255, 0.85)',
  // A count beside a label, as in the friend pill: white at 80%.
  textSubtle: 'rgba(255, 255, 255, 0.8)',
} as const;

// Around text that sits on the map itself, so that it stays readable over any ground: the `Main` frame's white
// glow. The frame also strokes the text in white, 3 wide; React Native has no stroke for text and one shadow, so
// the glow alone is drawn.
export const textHalo = {
  textShadowColor: 'rgba(255, 255, 255, 0.95)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 6,
} as const satisfies TextStyle;

// Over a photo, as on the loading screen: white at the frame's strengths, and the shade that keeps it readable.
export const onPhoto = {
  textMuted: 'rgba(255, 255, 255, 0.85)',
  textSubtle: 'rgba(255, 255, 255, 0.8)',
  track: 'rgba(255, 255, 255, 0.25)',
  textShadow: 'rgba(0, 0, 0, 0.35)',
  scrim:
    'linear-gradient(rgba(0, 26, 114, 0.25) 0%, rgba(14, 19, 48, 0.05) 35%, rgba(14, 19, 48, 0.35) 65%, rgba(0, 16, 64, 0.85) 100%)',
} as const;

// The sign-in screen's round button, as its frame draws it: a wide shadow in the key colour over a close one. No
// shadow of the design system is this deep.
export const signInButton = {
  shadow: '0 12px 32px rgba(0, 26, 114, 0.18), 0 2px 6px rgba(14, 19, 48, 0.08)',
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

// The text of the main screen's lists and buttons over the map, as the `Main` frame draws it: sizes and weights that
// the eight styles lack.
export const mapText = {
  // A row's name or title.
  rowTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 20 },
  // The line under it.
  rowLine: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16 },
  // The line over a Quest's title.
  rowKicker: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.11 },
  // "오늘 일정 없음".
  empty: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18 },
  // The two lines of "오늘의 발자국".
  buttonTitle: { fontFamily: font.bold, fontSize: 14, lineHeight: 18 },
  buttonLine: { fontFamily: font.medium, fontSize: 11, lineHeight: 14 },
  // The two lines of "활성 파티".
  smallTitle: { fontFamily: font.bold, fontSize: 12, lineHeight: 16 },
  smallLine: { fontFamily: font.medium, fontSize: 10, lineHeight: 13 },
} as const satisfies Record<string, TextStyle>;
