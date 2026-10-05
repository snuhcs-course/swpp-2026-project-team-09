import { size, space } from '@/design-system';

// Where the `Main` frame puts what floats over the map. The frame counts from its bottom edge, where its navigation
// takes 80: the bar's 64 and 16 under it, the room for the phone's own bar. Here everything is counted from the
// navigation's top edge, so that it holds on a phone whose own bar is higher than 16.

// The bar, without a line on top: the main screen draws a shadow there.
export const NAV_HEIGHT = size.bottomNav;

// Under the bar's items: the frame's 16, or the phone's own bar where that is higher.
export function navPaddingBottom(inset: number): number {
  return Math.max(space[4], inset);
}

// The zoom control: 18 from the right, its bottom 216 from the frame's bottom, which is 136 above the navigation.
export const ZOOM_CONTROL = { right: 18, bottom: 136 } as const;

// The toast's bottom is 158 from the frame's bottom, 78 above the navigation: over the row of buttons, clear of the
// AI input.
const TOAST_BOTTOM = 78;

// What the main screen tells the toast is taken at its bottom. The toast itself adds the phone's own bar, `inset`,
// and its own clear room of `space[6]`.
export function takenUnderToast(inset: number): number {
  return NAV_HEIGHT + navPaddingBottom(inset) - inset + TOAST_BOTTOM - space[6];
}
