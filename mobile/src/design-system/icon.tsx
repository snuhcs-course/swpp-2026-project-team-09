import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from './tokens';

// One stroke of an icon on the 24-point grid: a path, a circle (centre and radius) or a rounded rectangle.
type Stroke =
  | { path: string }
  | { circle: readonly [x: number, y: number, r: number] }
  | { rect: readonly [x: number, y: number, width: number, height: number, corner: number] };

// The design system's line icons: a 24-point grid, a 2-point round stroke, never filled.
const ICONS = {
  map: [{ path: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z' }, { path: 'M9 4v14' }, { path: 'M15 6v14' }],
  chat: [{ path: 'M4 5h16v11H9l-5 4z' }],
  users: [
    { circle: [9, 8, 3] },
    { path: 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6' },
    { circle: [17, 9, 2.5] },
    { path: 'M16.5 14c2.5.3 4.5 2.4 4.5 5' },
  ],
  flag: [{ path: 'M5 21V4' }, { path: 'M5 4h12l-2.5 4L17 12H5' }],
  user: [{ circle: [12, 8, 4] }, { path: 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8' }],
  plus: [{ path: 'M12 5v14' }, { path: 'M5 12h14' }],
  send: [{ path: 'M4 12 20 4l-6 16-3-7z' }, { path: 'M11 13l9-9' }],
  pin: [{ path: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z' }, { circle: [12, 10, 2.5] }],
  clock: [{ circle: [12, 12, 9] }, { path: 'M12 7v5l3 2' }],
  lock: [{ rect: [5, 11, 14, 10, 2] }, { path: 'M8 11V8a4 4 0 0 1 8 0v3' }],
  x: [{ path: 'M6 6l12 12' }, { path: 'M18 6 6 18' }],
  check: [{ path: 'M5 12l5 5 9-10' }],
  bus: [{ rect: [5, 4, 14, 13, 2] }, { path: 'M5 11h14' }, { path: 'M8 20v-3' }, { path: 'M16 20v-3' }],
  calendar: [{ rect: [4, 5, 16, 16, 2] }, { path: 'M4 10h16' }, { path: 'M9 3v4' }, { path: 'M15 3v4' }],
  search: [{ circle: [11, 11, 7] }, { path: 'M20 20l-4-4' }],
  route: [{ path: 'M12 3 20 20l-8-4-8 4z' }],
  book: [{ path: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z' }, { path: 'M4 19V5' }],
  meal: [
    { path: 'M7 3v8' },
    { path: 'M4 3v5a3 3 0 0 0 6 0V3' },
    { path: 'M7 11v10' },
    { path: 'M17 3c-2 1.5-3 4-3 7h3v11' },
  ],
  qr: [
    { rect: [4, 4, 6, 6, 1] },
    { rect: [14, 4, 6, 6, 1] },
    { rect: [4, 14, 6, 6, 1] },
    { path: 'M14 14h2v2h-2z' },
    { path: 'M18 18h2v2h-2z' },
    { path: 'M14 20h2' },
    { path: 'M20 14v2' },
  ],
  info: [{ circle: [12, 12, 9] }, { path: 'M12 11v6' }, { path: 'M12 7.5v.5' }],
  alert: [{ path: 'M12 3 2 20h20z' }, { path: 'M12 10v4' }, { path: 'M12 17v.5' }],
  layers: [{ path: 'M12 3 3 8l9 5 9-5z' }, { path: 'M3 13l9 5 9-5' }, { path: 'M3 17.5l9 5 9-5' }],
  // Not one of the design system's: the `Onboarding` frame draws it on the field that opens a list.
  chevronDown: [{ path: 'M6 9l6 6 6-6' }],
  // Not one of the design system's: the `Main` frame draws it on the button that zooms out.
  minus: [{ path: 'M5 12h14' }],
  // Not the design system's: the `Main` frame draws them on the friend pill, on the buttons that collapse a list and
  // on the button that opens the Quest list on the whole screen.
  chevronRight: [{ path: 'M9 6l6 6-6 6' }],
  // Not the design system's: the frames draw it on the back button of a screen above the tabs.
  chevronLeft: [{ path: 'M15 6l-6 6 6 6' }],
  chevronUp: [{ path: 'M6 15l6-6 6 6' }],
  // Not the design system's: the `Profile` frame draws it on the button that opens 알림.
  bell: [{ path: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z' }, { path: 'M10 20.5a2 2 0 0 0 4 0' }],
  expand: [{ path: 'M14 4h6v6' }, { path: 'M10 20H4v-6' }, { path: 'M20 4l-7 7' }, { path: 'M4 20l7-7' }],
} as const satisfies Record<string, readonly Stroke[]>;

export type IconName = keyof typeof ICONS;

function isIconName(name: string): name is IconName {
  return name in ICONS;
}

export const ICON_NAMES: readonly IconName[] = Object.keys(ICONS).filter((name): name is IconName => isIconName(name));

function strokeElement(stroke: Stroke, key: number): ReactElement {
  if ('path' in stroke) {
    return <Path d={stroke.path} key={key} />;
  }
  if ('circle' in stroke) {
    const [x, y, r] = stroke.circle;
    return <Circle cx={x} cy={y} key={key} r={r} />;
  }
  const [x, y, width, height, corner] = stroke.rect;
  return <Rect height={height} key={key} rx={corner} width={width} x={x} y={y} />;
}

interface IconProps {
  name: IconName;
  // In points. 22 in the bottom navigation, 18 to 20 in buttons and pins, 12 to 16 in badges and meta lines.
  size?: number;
  // The colour of the text the icon sits in.
  color?: string;
  // Set when the icon stands alone and carries meaning: it becomes the accessible name. Without it a screen reader
  // skips the icon.
  label?: string;
  testID?: string;
}

// What a screen reader gets: the label of an icon that stands alone, nothing of one beside its text. The web has its
// own attributes for this and warns about React Native's.
function screenReaderProps(label: string | undefined): object {
  if (Platform.OS === 'web') {
    return label === undefined ? { 'aria-hidden': true } : { 'aria-label': label, role: 'img' };
  }
  if (label === undefined) {
    return { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' };
  }
  return { accessible: true, accessibilityLabel: label, accessibilityRole: 'image', importantForAccessibility: 'yes' };
}

export function Icon({ name, size = 20, color: tint = color.ink, label, testID }: IconProps): ReactElement {
  const strokes: readonly Stroke[] = ICONS[name];
  return (
    <Svg
      {...screenReaderProps(label)}
      fill="none"
      height={size}
      stroke={tint}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      {strokes.map((stroke, index) => strokeElement(stroke, index))}
    </Svg>
  );
}
