/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, text } from '@/design-system';
import { AI_INPUT, listsTop } from '../layout';
import type { LevelHeights } from './card-levels';
import { contentMaxOf, type FrameCardProps, LEAST_CONTENT } from './frame-card-parts';

// The answer sheet's steps as heights (moved out of `open-card.tsx` for its length, P04 ticket 61). Low has one top
// edge for every answer and for the list of questions: the meal answer's, its header, two lines of words, the main
// button's row, and the input (P04 ticket 63). Middle covers `MID_SHARE` of the screen. High stands just under the time
// card.

// Low shows this many lines of the meal answer's words, at the phone's font size, over the fade.
const LOW_LINES = 2;
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
  // The scrolling part's laid-out height: the highest step's.
  room: number;
  // At low, the room under the last whole line of words that the footer's band hides, so that no line shows cut in half.
  band: number;
  // Low stands at its cap for every content: one top edge for every answer. Else, as for a card without steps or while
  // typing, every step fits a shorter content.
  fixedLow: boolean;
}

// Low's height and the band under its whole lines: two lines over the meal answer's footer, more over a smaller one.
function lowOf(mid: number, padTop: number, { line, footer }: { line: number; footer: number }): [number, number] {
  const low = Math.min(mid, Math.max(padTop + line + FADE, padTop + LOW_LINES * line + FADE + footer));
  const lines = Math.max(1, Math.floor((low - padTop - FADE) / line));
  return [low, Math.max(0, low - padTop - lines * line)];
}

// The most the scrolling part shows at each step, under the card's header (`above`); null until the stage is laid out.
export function useCaps(props: FrameCardProps, above: number, padTop: number): Caps | null {
  const { stageHeight, barRoom, raising, timeBarHeight = 0, fit = false } = props;
  const { top, bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  if (stageHeight === null) {
    return null;
  }
  if (raising === undefined) {
    const half = Math.max(LEAST_CONTENT, (contentMaxOf(stageHeight, barRoom) ?? LEAST_CONTENT) - above);
    return { low: half, mid: half, high: half, room: half, band: 0, fixedLow: false };
  }
  // High stops just under the time card as it stands by default, tucked away or not (h1, h2, k4). The stage runs from
  // under the status bar, `top` high, to the screen's bottom. Where the time card reaches lower than middle, middle is
  // high.
  const pillRoom = listsTop(top) + (timeBarHeight > 0 ? timeBarHeight + space[2] : 0);
  const under = stageHeight - pillRoom - barRoom - above;
  const mid = Math.max(LEAST_CONTENT, Math.min(under, (stageHeight + top) * MID_SHARE - barRoom - above));
  const high = Math.max(mid, under);
  if (fit) {
    return { low: mid, mid, high, room: high, band: 0, fixedLow: false };
  }
  const [low, band] = lowOf(mid, padTop, {
    line: text.bodyLg.lineHeight * fontScale,
    footer: bottom + FOOTER - barRoom,
  });
  return { low, mid, high, room: high, band, fixedLow: true };
}

// Under a stepped card's content, the room that lets its last row come clear of the fade; a card without steps shows
// its content whole, as it did, and tells that height (PR 516's review).
export function underOf(props: Pick<FrameCardProps, 'raising'>): number {
  return props.raising === undefined ? 0 : FADE;
}

// The heights the card runs to: as much as its content and the room under it (`under`), up to each step's cap. A fixed
// low is its cap for every content, a short one too, so that its top edge is one for every answer (P04 ticket 63), and
// middle and high are never under it. A content that lays out nothing below its top padding takes no room: the card is
// its header alone.
export function heightsOf(
  caps: Caps,
  natural: number | null,
  { padTop, under }: { padTop: number; under: number },
): LevelHeights {
  if (natural !== null && natural <= padTop + 0.5) {
    return { low: 0, mid: 0, high: 0 };
  }
  const fit = (cap: number): number => (natural === null ? cap : Math.min(cap, natural + under));
  const least = caps.fixedLow ? caps.low : 0;
  const high = Math.max(least, fit(caps.high));
  const mid = Math.max(least, Math.min(fit(caps.mid), high));
  return { low: caps.fixedLow ? caps.low : Math.min(fit(caps.low), mid), mid, high };
}
