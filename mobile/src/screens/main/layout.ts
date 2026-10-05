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
// above the navigation and 10 above the AI input's top (`AI_INPUT`): neither covers the other.
export const CARD = { side: space[4], bottom: 72 } as const;

// The friend list at the left and the Quest list at the right: 16 from the sides, each a header of 40 and, 8 under
// it, a window three rows high, a row being 56 and the room between two rows 2. The frame puts them 52 from its top
// edge, which is the top of the phone's screen; under a status bar that leaves less than 8 of that, they start 8
// below it.
export const LISTS = {
  side: space[4],
  top: 52,
  clear: space[2],
  friendsWidth: 160,
  questsWidth: 182,
  header: 40,
  gap: space[2],
  row: 56,
  rowGap: 2,
  rows: 3,
} as const;

// Three rows and the room between them: 172.
export const LIST_WINDOW = LISTS.rows * LISTS.row + (LISTS.rows - 1) * LISTS.rowGap;

// A list's distance from the top of what floats over the map, which starts under the status bar, `inset` high.
export function listsTop(inset: number): number {
  return Math.max(LISTS.top - inset, LISTS.clear);
}

// The AI input: 16 from the sides, its bottom 92 from the frame's bottom, which is 12 above the navigation. It is 50
// high, so its top is 62 above the navigation, 10 under a card's bottom.
export const AI_INPUT = { side: space[4], bottom: 12, height: 50 } as const;

// The row of "오늘의 발자국" and "활성 파티": 48 high, from 16 at the left to 70 from the right, its bottom 158 from
// the frame's bottom, which is 78 above the navigation.
export const BUTTON_ROW = { left: space[4], right: 70, bottom: 78, height: 48, gap: 6 } as const;

// The 편의기능 button: a round of 48 at the right of that row, 16 from the side.
export const LAYERS_BUTTON = { right: space[4], bottom: BUTTON_ROW.bottom, size: 48 } as const;

// What the controls cover of the map's edges, for `<Map inset>`: the credit for the map data and the provider's logo
// are drawn inside what is left. The row of buttons ends 126 above the navigation, so the credit sits just above
// "오늘의 발자국", in the strip that the frame leaves free between the friend list's end and that row; the 8 at the
// left brings it in line with the controls, 16 from the side. The zoom control takes 62 at the right, so the logo
// sits left of it, above "활성 파티". While a card is open the row and the zoom control are not shown and the card
// covers the bottom instead, up to its top edge.
const CREDIT_LEFT = space[2];
const ZOOM_CONTROL_RIGHT = 62;

export function mapInset(cardHeight: number | null): { bottom: number; left: number; right: number } {
  if (cardHeight !== null) {
    return { bottom: CARD.bottom + cardHeight, left: CREDIT_LEFT, right: CREDIT_LEFT };
  }
  return { bottom: BUTTON_ROW.bottom + BUTTON_ROW.height, left: CREDIT_LEFT, right: ZOOM_CONTROL_RIGHT };
}

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
