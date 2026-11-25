/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color, Icon, type IconName } from '@/design-system';

// The 파티 screens' line icons that the design system's `Icon` lacks, drawn in its style: a 24 grid, 2 wide, round
// ends. As the frame draws them: a ticket for 관련 행사, a "T" for 제목, lines of text for 본문, an eye for 공개 범위, a
// clipboard for 게시판 and the Boards, and a person with a plus for 친구 초대.
const DRAWN = {
  ticket: (
    <>
      <Path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />
      <Path d="M14 8v1.5M14 11.25v1.5M14 14.5V16" />
    </>
  ),
  title: (
    <>
      <Path d="M5 7V5h14v2" />
      <Path d="M12 5v14" />
      <Path d="M9 19h6" />
    </>
  ),
  lines: <Path d="M5 6h14M5 10h14M5 14h10M5 18h7" />,
  eye: (
    <>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <Circle cx={12} cy={12} r={2.8} />
    </>
  ),
  clipboard: (
    <>
      <Rect height={16} rx={2} width={14} x={5} y={4.5} />
      <Path d="M9 3.5h6v2.5H9zM8.5 11h7M8.5 15h5" />
    </>
  ),
  personPlus: (
    <>
      <Circle cx={10} cy={8.5} r={3.5} />
      <Path d="M3.5 19.5c.9-3.4 3.4-5 6.5-5s5.6 1.6 6.5 5" />
      <Path d="M19 8v6M16 11h6" />
    </>
  ),
} as const;

export type LineIconName = keyof typeof DRAWN | IconName;

function drawn(name: LineIconName): name is keyof typeof DRAWN {
  return name in DRAWN;
}

// A line icon: the design system's when it has one, else one drawn here. It stands beside its words, so a screen
// reader skips it.
export function LineIcon({
  name,
  size = 20,
  tint = color.ink,
}: {
  name: LineIconName;
  size?: number;
  tint?: string;
}): ReactElement {
  if (!drawn(name)) {
    return <Icon color={tint} name={name} size={size} />;
  }
  return (
    <Svg
      accessibilityElementsHidden
      accessible={false}
      fill="none"
      height={size}
      importantForAccessibility="no-hide-descendants"
      stroke={tint}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    >
      {DRAWN[name]}
    </Svg>
  );
}
