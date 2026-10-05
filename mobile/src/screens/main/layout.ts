import { size, space } from '@/design-system';

// Where the `Main` frame puts what floats over the map. The frame counts from its bottom edge, where its navigation
// takes 80: the bar's 64 and 16 for the phone's own bar. Here everything is counted from the navigation's top edge,
// so that it holds on a phone whose own bar is another height.

// The bar and the line on top of it.
export const NAV_HEIGHT = size.bottomNav + 1;

// The zoom control: 18 from the right, its bottom 216 from the frame's bottom.
export const ZOOM_CONTROL = { right: 18, bottom: 136 } as const;

// The toast's bottom is 158 from the frame's bottom: over the row of buttons, clear of the AI input.
const TOAST_BOTTOM = 78;

// What the main screen tells the toast is taken at its bottom. The toast adds the phone's own bar and its own
// clear room of `space[6]`.
export const TAKEN_UNDER_TOAST = NAV_HEIGHT + TOAST_BOTTOM - space[6];
