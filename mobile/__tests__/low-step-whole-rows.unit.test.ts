/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { space, text } from '@/design-system';
import { cutAt, LOW_LINES, type RowEdge, wholeCutsOf } from '@/screens/main/answer/card-caps';
import { ticketHeightAt } from '@/screens/main/library/seat-ticket';

// The answer card's low step shows the sentence's lines, then only whole rows (P01 ticket 32, the user's third report:
// a meal's third line and a no-Plan meal's row of buttons cut in half). Every answer kind's content is a stack of the
// rows its parts tell (`row-edges.tsx`), laid out as the app lays them, at sentences of one to three lines and at font
// scales 1 and 1.3. Jest lays nothing out, so each stack is built from the parts' own sizes: the type's line heights,
// the ticket's height, a button's and a chip's.
// Partitions: answer kind (meal Plan, no-Plan meal, seat card, booked seat, refusal over a Lookup, library outcome,
// the dots); sentence lines 1, 2, 3; font scale 1, 1.3; the place the step ends, every point from the top down.

const PAD_TOP: number = space[3];
const GAP: number = space[3];
const BUTTON = 40;
const CHIP = 34;

interface Part {
  height: number;
  line: number | null;
}

// The rows of a stack laid one under another, `gap` apart, under the content's top padding.
function stacked(parts: readonly Part[], gap = GAP): RowEdge[] {
  let top = PAD_TOP;
  return parts.map(({ height, line }) => {
    const row = { top, bottom: top + height, line };
    top += height + gap;
    return row;
  });
}

const lines = (count: number, lineHeight: number): Part => ({ height: count * lineHeight, line: lineHeight });
const block = (height: number): Part => ({ height, line: null });

// A meal's candidate row: its padding, the name's line, the way's and the dishes'.
const mealRow = (scale: number): Part =>
  block(2 * space[2] + (text.body.lineHeight + 2 * text.caption.lineHeight) * scale);

const KIND_NAMES = [
  'meal Plan',
  'no-Plan meal',
  'seat card',
  'booked seat',
  'refusal over a Lookup',
  'library outcome',
  'dots',
] as const;

type Kind = (typeof KIND_NAMES)[number];

const KINDS: Record<Kind, (sentence: number, scale: number) => RowEdge[]> = {
  'meal Plan': (sentence, scale) =>
    stacked([
      lines(sentence, text.body.lineHeight * scale),
      block(CHIP + 2 * space[1]),
      mealRow(scale),
      mealRow(scale),
    ]),
  'no-Plan meal': (sentence, scale) => stacked([lines(sentence, text.title.lineHeight * scale), block(BUTTON)]),
  'seat card': (sentence, scale) =>
    stacked([lines(sentence, text.body.lineHeight * scale), block(ticketHeightAt(scale))], space[2]),
  'booked seat': (_sentence, scale) =>
    stacked([block(ticketHeightAt(scale)), block(text.caption.lineHeight * scale)], space[1]),
  'refusal over a Lookup': (sentence, scale) =>
    stacked([
      block(CHIP),
      lines(1, text.title.lineHeight * scale),
      lines(sentence, text.body.lineHeight * scale),
      block(BUTTON),
    ]),
  'library outcome': (sentence, scale) => stacked([lines(sentence, text.body.lineHeight * scale), block(30)], space[2]),
  dots: () => stacked([block(BUTTON)]),
};

// Whether a place is inside a row: within a block, or between two lines of words.
function inside(place: number, { top, bottom, line }: RowEdge): boolean {
  if (place <= top + 0.5 || place >= bottom - 0.5) {
    return false;
  }
  if (line === null) {
    return true;
  }
  const at = (place - top) / line;
  return Math.abs(at - Math.round(at)) * line > 0.5;
}

const CASES = KIND_NAMES.flatMap((kind) =>
  [1, 2, 3].flatMap((sentence) => [1, 1.3].map((scale) => [kind, sentence, scale] as const)),
);

describe("every answer kind's low step", () => {
  it.each(CASES)(
    '%s with %i sentence lines at font scale %s ends on a row, wherever it ends',
    (kind, sentence, scale) => {
      const rows = KINDS[kind](sentence, scale);
      const cuts = wholeCutsOf(rows);
      const end = Math.max(...rows.map(({ bottom }) => bottom));

      for (let seen = PAD_TOP; seen <= end + 40; seen += 1) {
        const cut = cutAt(cuts, seen) ?? Number.NaN;
        expect(cut).toBeLessThanOrEqual(seen + 0.5);
        expect(rows.filter((row) => inside(cut, row))).toEqual([]);
      }
    },
  );

  it.each(CASES)(
    '%s with %i sentence lines at font scale %s shows its sentence lines first',
    (kind, sentence, scale) => {
      const rows = KINDS[kind](sentence, scale);
      const words = rows.find(({ line }) => line !== null);
      const line = words?.line ?? null;
      if (words === undefined || line === null) {
        return;
      }
      const cuts = wholeCutsOf(rows);

      expect(cutAt(cuts, words.top + line)).toBeCloseTo(words.top + line);
    },
  );
});

// The rule before: whole lines of the sentence's type from the content's top, whatever stood there. At the low step
// over a main button (two lines over the fade), it cut these kinds' rows in half.
function lineCut(scale: number): number {
  const line = text.bodyLg.lineHeight * scale;
  const seen = PAD_TOP + LOW_LINES * line;
  return PAD_TOP + Math.floor((seen - PAD_TOP) / line) * line;
}

describe('the line rule it replaces', () => {
  it.each([
    ['no-Plan meal', 2, 1],
    ['refusal over a Lookup', 1, 1],
    ['seat card', 1, 1.3],
    ['meal Plan', 3, 1.3],
  ] as const)('cut %s with %i sentence lines at font scale %s in half', (kind, sentence, scale) => {
    const rows = KINDS[kind](sentence, scale);
    const cut = lineCut(scale);

    expect(rows.some((row) => inside(cut, row))).toBe(true);
    expect(rows.some((row) => inside(cutAt(wholeCutsOf(rows), cut) ?? Number.NaN, row))).toBe(false);
  });
});
