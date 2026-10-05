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

// A card of something pressed on the map: 16 from the sides, its bottom 152 from the frame's bottom, which is 72
// above the navigation and clear of the AI input.
export const CARD = { side: space[4], bottom: 72 } as const;

// What the screen's controls take at each edge of the map, with clear room of 16: the two lists end 272 from the
// top; the row of buttons above the AI input ends 126 above the navigation; the zoom control takes 62 at the right.
// A route is fitted into what is left, less the room for the name under a pin at either end: a name is up to about
// 60 wide, half of it at each side of the pin, and 19 high with its distance from the pin's foot.
const NAME = { half: 30, under: 24 } as const;
export const ROUTE_PADDING = {
  top: 288,
  right: 78 + NAME.half,
  bottom: 142 + NAME.under,
  left: 16 + NAME.half,
} as const;

// The toast's bottom is 158 from the frame's bottom, 78 above the navigation: over the row of buttons, clear of the
// AI input.
const TOAST_BOTTOM = 78;

// What the main screen tells the toast is taken at its bottom. The toast itself adds the phone's own bar, `inset`,
// and its own clear room of `space[6]`.
export function takenUnderToast(inset: number): number {
  return NAV_HEIGHT + navPaddingBottom(inset) - inset + TOAST_BOTTOM - space[6];
}

// Between an open card's top and a toast.
const OVER_CARD = space[2];

// The same while a card is open: the toast sits above the card, so that it never lies over the card's buttons.
export function takenUnderToastOverCard(inset: number, cardHeight: number): number {
  return NAV_HEIGHT + navPaddingBottom(inset) - inset + CARD.bottom + cardHeight + OVER_CARD - space[6];
}
