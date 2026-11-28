/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { use } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, text } from '@/design-system';
import { AI_INPUT, listsTop } from '../layout';
import type { LevelHeights } from './card-levels';
import { BAR_ADD_HEIGHT } from './condition-chips';
import { contentMaxOf, type FrameCardProps, LEAST_CONTENT } from './frame-card-parts';
import { useSteady } from './steady';
import { skippedLineOf } from './skipped-classes';
import { LANE_HEIGHT } from './time-band';
import { TUCK_STRIP } from './time-card-grip';
import { SheetLinkContext } from './sheet-link';
import { type TopStops, topRoomOf } from './top-stops';

// The answer sheet's steps as heights (moved out of `open-card.tsx` for its length, P04 ticket 61). Low has one top
// edge for every answer and for the list of questions: the meal answer's, its header, two lines of words, the main
// button's row, and the input (P04 ticket 63). Middle covers `MID_SHARE` of the screen. High stands just under the time
// card. The sheet is laid out once, at the most room any top leaves.

// Low shows this many lines of the meal answer's words, at the phone's font size, over the fade.
export const LOW_LINES = 2;
// The soft edge where the content passes under the footer.
export const FADE = space[3];
// The footer low's top edge is measured over, above the navigation's inset that lifts the input (`MapBottom`): the
// input bar of one line, and the main button's row above it with its gap (`AiInput`, the button of size "bar", 50
// high), and the room over them (`AnswerFrame`'s `barRoom`). A footer with less, an answer with no main button or the
// list of questions open, gives what it lacks to the content.
const MAIN_ROW = 50;
const FOOTER = AI_INPUT.bottom + AI_INPUT.height + space[2] + MAIN_ROW + space[3];
// Middle's share of the screen, from the status bar's top to the screen's bottom: the card covers this much of it, far
// enough from low's and high's that each step shows clearly more (the user's phone check of ticket 61).
export const MID_SHARE = 0.6;

export interface Caps extends LevelHeights {
  // The scrolling part's laid-out height: high's under the strip at the stage's top, the most room any top leaves.
  room: number;
  // At low, the room under the last whole line of words that the footer's band hides, so that no line shows cut in half.
  band: number;
  // Every step stands at its cap for every content: one top edge for every answer at each step. Else, as for a card
  // without steps or while typing, every step fits a shorter content.
  fixedSteps: boolean;
}

// Low's height and the band under its whole lines: two lines over the meal answer's footer, more over a smaller one.
function lowOf(mid: number, padTop: number, { line, footer }: { line: number; footer: number }): [number, number] {
  const low = Math.min(mid, Math.max(padTop + line + FADE, padTop + LOW_LINES * line + FADE + footer));
  const lines = Math.max(1, Math.floor((low - padTop - FADE) / line));
  return [low, Math.max(0, low - padTop - lines * line)];
}

// The place the folded time card takes, as `time-bar.tsx` lays it out: its top padding, the head's row, the track's
// lane, and the ends' row, 4 apart, then the grip's strip under a gap of 4. Its rows of words grow with the font. While
// a Class is left out of the Plan, the line of those Classes makes it one fixed step taller (P04 ticket 93).
export function foldedTimeCardOf(fontScale: number, skippedLine = false): number {
  const head = Math.max(BAR_ADD_HEIGHT, text.label.lineHeight * fontScale);
  const ends = text.caption.lineHeight * fontScale;
  const skipped = skippedLine ? skippedLineOf(fontScale) : 0;
  return space[3] + head + space[1] + LANE_HEIGHT + space[1] + ends + skipped + space[1] + TUCK_STRIP;
}

// The room over high's edge, from the lists' top. High's top edge is one line for every answer and state: just under the
// place the folded time card takes, whether one stands there or not, tucked away or not, whatever its measured height
// (h1, h2, k4; the user's phone, 2026-11-26: while an answer loaded, before its time card, high covered the whole
// screen). Only the top of several requests unfolded, with a Plan's bar under the steps card, reaches lower, and high
// stands under it then. Under the bar of several requests, how far the top is folded moves the edge (P01 ticket 22):
// under the grip strip at the stage's top at stop 0, under the steps card and the strip under it at 1, and at 2 as
// above. Each stop's edge stays where it is while an answer loads. An answer to one request keeps the one edge. The top
// is read as the stops hold it, in the same render as the stop: the height the top tells (`stepsTop`) reaches here two
// renders after it, and at each unfold high stood for a quarter of a second under the top as it was (P01 ticket 45).
function topRoomUnder(
  stops: TopStops | undefined,
  { stepsTop, unfolded, folded, lists }: { stepsTop: number; unfolded: number; folded: number; lists: number },
): number {
  if (stops === undefined || stepsTop === 0) {
    return folded;
  }
  return topRoomOf(stops.stop, { stepsHeight: stops.stepsHeight, folded: Math.max(folded, unfolded), lists });
}

// The most the scrolling part shows at each step, under the card's header (`above`); null until the stage is laid out.
// The stage runs from under the status bar, `top` high, to the screen's bottom. Where high's place reaches lower than
// middle, middle is high.
export function useCaps(props: FrameCardProps, above: number, padTop: number): Caps | null {
  const { stageHeight, barRoom, raising, fit = false } = props;
  const { top, bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const stops = use(SheetLinkContext).top;
  // The top's heights come from its layout: a fraction of a point moves no step (`steady.ts`).
  const stepsTop = useSteady(props.stepsTop ?? 0);
  const unfolded = useSteady(stops?.unfoldedHeight ?? 0);
  if (stageHeight === null) {
    return null;
  }
  if (raising === undefined) {
    const half = Math.max(LEAST_CONTENT, (contentMaxOf(stageHeight, barRoom) ?? LEAST_CONTENT) - above);
    return { low: half, mid: half, high: half, room: half, band: 0, fixedSteps: false };
  }
  const folded = foldedTimeCardOf(fontScale, props.skippedLine);
  const topRoom = topRoomUnder(stops, { stepsTop, unfolded, folded, lists: listsTop(top) });
  const free = stageHeight - barRoom - above;
  const under = free - listsTop(top) - topRoom - space[2];
  const mid = Math.max(LEAST_CONTENT, Math.min(under, (stageHeight + top) * MID_SHARE - barRoom - above));
  const high = Math.max(mid, under);
  // Laid out at the most room any top leaves, under the strip at the stage's top, so that no fold, step, or line of
  // left-out Classes lays the sheet out again: laid out at high, at each fold it was laid out again while it stood at
  // middle, its place on the UI thread came a frame after that layout, and its top edge dipped (P01 ticket 45).
  const room = Math.max(high, free - TUCK_STRIP - space[2]);
  if (fit) {
    return { low: mid, mid, high, room, band: 0, fixedSteps: false };
  }
  const [low, band] = lowOf(mid, padTop, {
    line: text.bodyLg.lineHeight * fontScale,
    footer: bottom + FOOTER - barRoom,
  });
  return { low, mid, high, room, band, fixedSteps: true };
}

// Under a stepped card's content, the room that lets its last row come clear of the fade; a card without steps shows
// its content whole, as it did, and tells that height (PR 516's review).
export function underOf(props: Pick<FrameCardProps, 'raising'>): number {
  return props.raising === undefined ? 0 : FADE;
}

// The heights the card runs to. A stepped card stands at its caps whatever its content's height, so that low, middle,
// and high are three clear steps for every answer, a short one included, the content at the top and room under it
// (P04 ticket 63, boards k1 and k3). A card without steps, or while typing, runs as far as its content and the room
// under it (`under`), up to each cap. A content that lays out nothing below its top padding takes no room: the card is
// its header alone.
export function heightsOf(
  caps: Caps,
  natural: number | null,
  { padTop, under }: { padTop: number; under: number },
): LevelHeights {
  if (natural !== null && natural <= padTop + 0.5) {
    return { low: 0, mid: 0, high: 0 };
  }
  if (caps.fixedSteps) {
    return { low: caps.low, mid: caps.mid, high: caps.high };
  }
  const fit = (cap: number): number => (natural === null ? cap : Math.min(cap, natural + under));
  const high = fit(caps.high);
  const mid = Math.min(fit(caps.mid), high);
  return { low: Math.min(fit(caps.low), mid), mid, high };
}
