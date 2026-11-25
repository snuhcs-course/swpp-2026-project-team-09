/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
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
  // Darker, for a tour that dims all but one control so that it stands out.
  scrimStrong: 'rgba(14, 19, 48, 0.64)',
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
  // Around merged study pins, the frame's translucent outer square: the study colour at 22%.
  study: 'rgba(3, 105, 161, 0.22)',
} as const;

// The glass layer's surfaces, as the changelog of 11.24 (§ 5-1) and its Mf5Kit board draw the Assistant over the map.
// Only `Glass` (glass.tsx) reads them: a screen names a level and never these values. `line` is the thin light line
// along a surface's top, `rim` the light border of a chip on the map.
export const glass = {
  // Outer bars, bottom sheets and cards over the map: white at 50%, the line, and a floating shadow.
  panel: { ground: 'rgba(255, 255, 255, 0.5)', shadow: '0 4px 16px rgba(14, 19, 48, 0.16)' },
  // Chips, boxes, white buttons and light coloured chips inside a panel: white at 80%.
  inner: { ground: 'rgba(255, 255, 255, 0.8)' },
  // A grey input field inside a panel: the key colour at 5%.
  field: { ground: 'rgba(0, 26, 114, 0.05)' },
  // A small chip that stands on the map itself, such as a walk's minutes: white at 60%, a rim, a light shadow.
  mapChip: { ground: 'rgba(255, 255, 255, 0.6)', rim: 'rgba(255, 255, 255, 0.75)', shadow: '0 4px 14px rgba(14, 19, 48, 0.12)' },
  // The black chip of a time and a place ("10:45 301동"): the ink at 48%.
  darkChip: { ground: 'rgba(14, 19, 48, 0.48)' },
  line: 'inset 0 1px 0 rgba(255, 255, 255, 0.85)',
} as const;

// The colour that says what a person is doing: a status's dot on an Avatar, a row's dot in the friend list and the
// fill of a person's marker on the map. `member` is a member of the User's Party who is not a Friend.
export const presence = {
  free: color.live,
  class: color.snuBlue,
  moving: color.warning,
  // A Friend whose position is shared, with no status beyond it.
  on: color.live,
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

// The 새내기 튜토리얼's warm look, as the `Main` and `Profile` frames draw it: the Quest colour's ink on a cream ground.
// `round` is the 내 정보 row's round, `dotNow` the sheet's dot of the quest shown.
export const tutorialTone = {
  ink: color.quest,
  words: '#6B4500',
  ground: '#FFFBF0',
  border: '#F1DFAF',
  box: '#FFF8E6',
  round: '#FFF1C9',
  dotNow: '#E8A400',
  // As the canvas's 새내기 튜토리얼 boards draw the list and the guides (P15 ticket 53): the green of a completed quest,
  // its ✓ and ✓ 완료, with its banner's ground and words; the grey of what is not there yet.
  done: '#0B8A5B',
  doneSoft: '#E6F6EF',
  doneWords: color.live,
  idle: '#EEF0F5',
  // The faint chevron and arrows.
  faint: '#A9B0C4',
  // The rows of an online step.
  rowsGround: '#F5F7FB',
  rowsLine: '#C9D0E0',
  link: color.blue600,
} as const;

// The Tutorial Categories' colours as the canvas's boards draw them: an ink and a soft ground for each, by the
// category's place in the list (생활, 공부·학사, 이동, 건강, 문화·여가); a sixth starts again from the first.
export const tutorialCategoryTones = [
  { ink: '#E8590C', soft: '#FFF0E6' },
  { ink: '#3D63D6', soft: '#EAF0FF' },
  { ink: '#7048E8', soft: '#F1ECFF' },
  { ink: '#0B8A5B', soft: '#E6F6EF' },
  { ink: '#D6336C', soft: '#FFEAF1' },
] as const;

export type TutorialCategoryTone = (typeof tutorialCategoryTones)[number];

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

// The 행사 tab's colour, as the `Events` frame draws it, which no token of the design system names: the words of a row's
// time and place and of an event's description, between `ink` and `inkMuted`. The frame's light blues of the chosen
// filter and of "모집 중인 파티" (#E3EAFB) and of a row opened from elsewhere (#F1F4FB) are drawn in `blue100` and
// `blue50`, a step of the design system's from each.
export const eventTone = {
  words: '#3A4060',
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
  // The title of the answer frame's pick.
  buttonTitle: { fontFamily: font.bold, fontSize: 14, lineHeight: 18 },
  // The two lines of "활성 파티".
  smallTitle: { fontFamily: font.bold, fontSize: 12, lineHeight: 16 },
  smallLine: { fontFamily: font.medium, fontSize: 10, lineHeight: 13 },
} as const satisfies Record<string, TextStyle>;

// The text of the 행사 tab and its sheet, as the `Events` frame draws it: sizes the eight styles lack. The frame's weight
// 800 is drawn in Bold, the heaviest the app loads.
export const eventText = {
  // The day of the month in the date column, and the month and day name under it.
  day: { fontFamily: font.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.68 },
  dayLine: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  // The source over the title.
  source: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
  // The time and the place.
  line: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  // The filters, chosen and not.
  filter: { fontFamily: font.medium, fontSize: 16, lineHeight: 22 },
  filterChosen: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  // "다가오는 행사".
  heading: { fontFamily: font.bold, fontSize: 16, lineHeight: 24 },
  // "모집 중인 파티 {n}", and "함께 갈 파티 찾기".
  party: { fontFamily: font.bold, fontSize: 15, lineHeight: 20 },
  partyFind: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 20 },
  // The detail sheet, whose title is `text.titleLg`: a row's key and value, and the description.
  key: { fontFamily: font.medium, fontSize: 14, lineHeight: 22 },
  value: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22 },
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 23 },
} as const satisfies Record<string, TextStyle>;
