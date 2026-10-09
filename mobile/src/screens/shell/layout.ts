// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { size, space } from '@/design-system';

// The bottom navigation under the tabs, as the frames draw it: the bar's 64 and 16 under it, the room for the phone's
// own bar. It has no line on top but a shadow.
export const NAV_HEIGHT = size.bottomNav;

// Under the bar's items: the frame's 16, or the phone's own bar where that is higher.
export function navPaddingBottom(inset: number): number {
  return Math.max(space[4], inset);
}

// On 파티, 행사 and 내 정보 the frames put a toast's bottom 96 from the frame's bottom: 16 above the navigation. The
// toast itself adds the phone's own bar, `inset`, and its own clear room of `space[6]`.
export function takenUnderToastOverNav(inset: number): number {
  return NAV_HEIGHT + navPaddingBottom(inset) - inset + space[4] - space[6];
}
