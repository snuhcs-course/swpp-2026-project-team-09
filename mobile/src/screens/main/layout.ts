/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { space } from '@/design-system';
import { CREDIT_ROOM } from '@/map';
import { NAV_HEIGHT, navPaddingBottom } from '../shell/layout';

// Where the `Main` frame puts what floats over the map. The frame counts from its bottom edge, where its navigation
// takes 80: the bar's 64 and 16 under it, the room for the phone's own bar. Here everything is counted from the
// navigation's top edge, so that it holds on a phone whose own bar is higher than 16.

// The zoom control: 18 from the right, its bottom 216 from the frame's bottom, which is 136 above the navigation. It
// is 134 high: three buttons of 44 and two lines of 1.
export const ZOOM_CONTROL = { right: 18, bottom: 136, height: 134 } as const;

// A card of something pressed on the map: 16 from the sides, its bottom 152 from the frame's bottom, which is 72
// above the navigation and 10 above the AI input's top (`AI_INPUT`): neither covers the other.
export const CARD = { side: space[4], bottom: 72 } as const;

// The friend list at the left and the Quest list at the right: 16 from the sides, each a header of 40 and, 8 under
// it, a window of up to three rows, a row being 56 and the room between two rows 2. The frame puts them 52 from its
// top edge, which is the top of the phone's screen; under a status bar that leaves less than 8 of that, they start 8
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

// A list's distance from the top of what floats over the map, which starts under the status bar, `inset` high.
export function listsTop(inset: number): number {
  return Math.max(LISTS.top - inset, LISTS.clear);
}

// What floats over the map is laid out in the stage: the room between the status bar and the navigation. `stage` is
// its size, null until it is laid out; `cardHeight` is the open card's height, null while no card is open.
export interface Room {
  stage: { width: number; height: number } | null;
  cardHeight: number | null;
}

// The two columns never share a point. The Quest column keeps the frame's 182, which a title of 146 beside its round
// needs; the friend column has the frame's 160 or, on a stage narrower than 374, what is left: 146 at 360.
export function friendsWidth({ stage }: Room): number {
  if (stage === null) {
    return LISTS.friendsWidth;
  }
  return Math.max(0, Math.min(LISTS.friendsWidth, stage.width - 2 * LISTS.side - LISTS.questsWidth));
}

// What is under each list's window, counted from the stage's bottom, with clear room of 8. The rule: a window never
// reaches what takes a press under it, nor the strip in which the map draws its credit (`mapInset`).
// - While a card is open, both end above the credit, which sits on the card.
// - Otherwise the friend list ends above the credit, which sits on "오늘의 발자국", and the Quest list above the
//   zoom control.
function underLists(cardHeight: number | null): { friends: number; quests: number } {
  if (cardHeight !== null) {
    const card = CARD.bottom + cardHeight + CREDIT_ROOM + LISTS.clear;
    return { friends: card, quests: card };
  }
  return {
    friends: BUTTON_ROW.bottom + BUTTON_ROW.height + CREDIT_ROOM + LISTS.clear,
    quests: ZOOM_CONTROL.bottom + ZOOM_CONTROL.height + LISTS.clear,
  };
}

// How many whole rows fit between a window's top and what is `under` it: the frame's three where they fit, fewer on
// a low stage, none where not even one fits. Until the stage is laid out, three.
function rowsOver(under: number, stage: Room['stage'], inset: number): number {
  if (stage === null) {
    return LISTS.rows;
  }
  const room = stage.height - (listsTop(inset) + LISTS.header + LISTS.gap) - under;
  const rows = Math.floor((room + LISTS.rowGap) / (LISTS.row + LISTS.rowGap));
  return Math.max(0, Math.min(LISTS.rows, rows));
}

// The rows each list's window shows, under a status bar `inset` high.
export function listRows({ stage, cardHeight }: Room, inset: number): { friends: number; quests: number } {
  const under = underLists(cardHeight);
  return { friends: rowsOver(under.friends, stage, inset), quests: rowsOver(under.quests, stage, inset) };
}

// A window's height: its rows and the room between them. 172 for three.
export function listWindow(rows: number): number {
  return rows * LISTS.row + Math.max(0, rows - 1) * LISTS.rowGap;
}

// The AI input: 16 from the sides, its bottom 92 from the frame's bottom, which is 12 above the navigation. It is 50
// high, so its top is 62 above the navigation, 10 under a card's bottom.
export const AI_INPUT = { side: space[4], bottom: 12, height: 50 } as const;

// The row of "오늘의 발자국" and "활성 파티": 48 high, from 16 at the left to 70 from the right, its bottom 158 from
// the frame's bottom, which is 78 above the navigation.
export const BUTTON_ROW = { left: space[4], right: 70, bottom: 78, height: 48, gap: 6 } as const;

// The frame's width, at which both buttons of the row are whole, and the narrowest stage that still has a face.
const FRAME_WIDTH = 390;
const FACE_WIDTH = 360;

// What "오늘의 발자국" shows beside its name. On a stage narrower than the frame it gives way to "활성 파티", whose
// two lines stay whole: first it drops its second line and keeps one face, under 360 it has no face, and what is
// still missing is cut from its name with an ellipsis, since it is the one button of the row that shrinks. Alone in
// the row, or until the stage is laid out, it is whole.
export function footprintsForm({ stage }: Room, withParty: boolean): { faces: number; line: boolean } {
  if (!withParty || stage === null || stage.width >= FRAME_WIDTH) {
    return { faces: 3, line: true };
  }
  return { faces: stage.width >= FACE_WIDTH ? 1 : 0, line: false };
}

// The 편의기능 button: a round of 48 at the right of that row, 16 from the side.
export const LAYERS_BUTTON = { right: space[4], bottom: BUTTON_ROW.bottom, size: 48 } as const;

// The stack of layers over it: toggles of 60 in a padding of 6, centred over the button and 8 above it.
const STACK_WIDTH = 60 + 2 * 6;
export const LAYER_STACK = {
  right: LAYERS_BUTTON.right + (LAYERS_BUTTON.size - STACK_WIDTH) / 2,
  bottom: LAYERS_BUTTON.bottom + LAYERS_BUTTON.size + space[2],
} as const;

// What the controls cover of the map's edges, for `<Map inset>`: the credit for the map data and the provider's logo
// are drawn inside what is left. The row of buttons ends 126 above the navigation, so the credit sits just above
// "오늘의 발자국", in a strip that the friend list always leaves free (`listRows`); the 8 at the left brings it in
// line with the controls, 16 from the side. The zoom control takes 62 at the right, so the logo
// sits left of it, above "활성 파티". While a card is open the row and the zoom control are not shown and the card
// covers the bottom instead, up to its top edge: the credit sits on the card, and both lists end above it.
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
