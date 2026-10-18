/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { size, space } from '@/design-system';

// The bottom navigation under the tabs, as the frames draw it: the bar's 64 and 16 under it, the room for the phone's
// own bar. It has no line on top but a shadow.
export const NAV_HEIGHT = size.bottomNav;

// Under the bar's items: the frame's 16, or the phone's own bar where that is higher.
export function navPaddingBottom(inset: number): number {
  return Math.max(space[4], inset);
}

// The navigation's whole height from the bottom of the screen, the phone's own bar with it: what lies under a tab.
export function tabBarHeight(inset: number): number {
  return NAV_HEIGHT + navPaddingBottom(inset);
}

// On 파티, 행사 and 내 정보 the frames put a toast's bottom 96 from the frame's bottom: 16 above the navigation. The
// toast itself adds the phone's own bar, `inset`, and its own clear room of `space[6]`.
export function takenUnderToastOverNav(inset: number): number {
  return NAV_HEIGHT + navPaddingBottom(inset) - inset + space[4] - space[6];
}
