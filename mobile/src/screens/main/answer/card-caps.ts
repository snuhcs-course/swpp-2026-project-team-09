/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

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

// The answer sheet's steps as heights (moved out of `open-card.tsx` for its length, P04 ticket 61). Low has one top
// edge for every answer and for the list of questions: the meal answer's, its header, two lines of words, the main
// button's row, and the input (P04 ticket 63). Middle covers `MID_SHARE` of the screen. High stands just under the time
// card.

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
  // The scrolling part's laid-out height: the highest step's.
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

// A part of the content that stands as a row, from the content's top: lines of words, a ticket, a list's row, a row of
// buttons or chips (`row-edges.tsx`). `line`, for lines of words, is each line's height.
export interface RowEdge {
  top: number;
  bottom: number;
  line: number | null;
}

// Half a point: a place within it of another is the same place.
const SAME = 0.5;

// The places the content may end at, in order (P01 ticket 32, one rule for every answer kind): the top or the bottom of
// a row, or the bottom of a line inside lines of words, and never a place inside a row. The low step's content ends at
// the last of them that shows (`cutAt`), the sentence's lines first, then only whole rows; a part that tells no row is
// never cut either, as no place is offered inside it. With no row told, there is none.
export function wholeCutsOf(rows: readonly RowEdge[]): number[] {
  const places = rows.flatMap(({ top, bottom, line }) => {
    if (line === null || line <= 0) {
      return [top, bottom];
    }
    const lines = Math.floor((bottom - top + SAME) / line);
    return [top, bottom, ...Array.from({ length: lines }, (_, index) => top + (index + 1) * line)];
  });
  const inside = (place: number, { top, bottom, line }: RowEdge): boolean => {
    if (place <= top + SAME || place >= bottom - SAME) {
      return false;
    }
    if (line === null || line <= 0) {
      return true;
    }
    const lines = (place - top) / line;
    return Math.abs(lines - Math.round(lines)) * line > SAME;
  };
  const cuts = places.filter((place) => !rows.some((row) => inside(place, row))).toSorted((one, other) => one - other);
  const kept: number[] = [];
  for (const cut of cuts) {
    if (kept.length === 0 || cut - (kept.at(-1) ?? cut) > SAME) {
      kept.push(cut);
    }
  }
  return kept;
}

// The last place the content may end at that shows above `seen`, from the content's top; null with no place told.
export function cutAt(cuts: readonly number[], seen: number): number | null {
  'worklet';
  let found: number | null = null;
  for (const cut of cuts) {
    if (cut > seen + SAME) {
      break;
    }
    found = cut;
  }
  return found;
}

// At low, the room the band covers over the footer (`LowBand`) with the content scrolled `y`: under the last whole row
// that shows, measured (`cuts`); with nothing measured, under the last whole line (`Caps.band`).
export function bandAt(y: number, low: number, cuts: readonly number[], lineBand: number): number {
  'worklet';
  const cut = cutAt(cuts, y + low - FADE);
  if (cut === null) {
    return lineBand;
  }
  return Math.min(low, Math.max(0, y + low - Math.max(cut, y)));
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

// The most the scrolling part shows at each step, under the card's header (`above`); null until the stage is laid out.
export function useCaps(props: FrameCardProps, above: number, padTop: number): Caps | null {
  const { stageHeight, barRoom, raising, fit = false } = props;
  const { top, bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // The bar of several requests comes from its layout: a fraction of a point moves no step (`steady.ts`).
  const stepsTop = useSteady(props.stepsTop ?? 0);
  if (stageHeight === null) {
    return null;
  }
  if (raising === undefined) {
    const half = Math.max(LEAST_CONTENT, (contentMaxOf(stageHeight, barRoom) ?? LEAST_CONTENT) - above);
    return { low: half, mid: half, high: half, room: half, band: 0, fixedSteps: false };
  }
  // High's top edge is one line for every answer and state: just under the place the folded time card takes, whether
  // one stands there or not, tucked away or not, whatever its measured height (h1, h2, k4; the user's phone, 2026-11-26:
  // while an answer loaded, before its time card, high covered the whole screen). Only the bar of several requests,
  // with a Plan's bar under it, reaches lower, and high stands under it then. The stage runs from under the status bar,
  // `top` high, to the screen's bottom. Where that place reaches lower than middle, middle is high.
  const pillRoom = listsTop(top) + Math.max(foldedTimeCardOf(fontScale, props.skippedLine), stepsTop) + space[2];
  const under = stageHeight - pillRoom - barRoom - above;
  const mid = Math.max(LEAST_CONTENT, Math.min(under, (stageHeight + top) * MID_SHARE - barRoom - above));
  const high = Math.max(mid, under);
  if (fit) {
    return { low: mid, mid, high, room: high, band: 0, fixedSteps: false };
  }
  const [low, band] = lowOf(mid, padTop, {
    line: text.bodyLg.lineHeight * fontScale,
    footer: bottom + FOOTER - barRoom,
  });
  return { low, mid, high, room: high, band, fixedSteps: true };
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
