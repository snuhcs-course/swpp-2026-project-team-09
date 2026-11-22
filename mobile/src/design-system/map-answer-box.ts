/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLabel } from './map-answer';
import { mapText, space } from './tokens';

// The sizes of an answer's mark (`MapAnswerMark`) and the box its label takes, which the camera and the labels' sides
// read without drawing it.

export const ANSWER_SYMBOL_BOX = 36;
export const GAP = 2;
export const LABEL_MAX = 180;
// A candidate's tag with its dishes and price under its name, and the pick's flag with its first dish after its time:
// boards 22 and 24 show "부대짬뽕&군만두 외 4 · 5,000원부터" whole.
export const SUB_MAX = 260;
export const RING = 2;
export const BADGE = 16;

// A label's height, the tallest of its kind: one line of the pick's title with the padding and the pick's border at
// the top and at the bottom, or that title and a line under it.
const ONE_LINE = mapText.buttonTitle.lineHeight + 2 * GAP + 2 * RING;
const TWO_LINES = mapText.buttonTitle.lineHeight + mapText.rowLine.lineHeight + 2 * space[1] + 2 * RING;
// The advance widths of `assets/fonts/Pretendard-SemiBold.otf` and `Pretendard-Bold.otf` as shares of the font's
// size, each class at its widest letter in either font, rounded up: a Hangul syllable 0.864; a space, "·", ":", ".",
// and "," 0.287; "W", "M", "m", "w", "%", "@", and the capitals "A", "C", "D", "G", "H", "N", "O", "Q", "U", "V", "X",
// and "Y" 0.999, and any letter outside ASCII, such as "→" (0.922), "—", or "…", no wider but for rare symbols such as
// "㎯"; any other letter 0.663.
const HANGUL = /\p{Script=Hangul}/u;
const NARROW = /[\s·:.,]/u;
const WIDE = /[WMmw%@ACDGHNOQUVXY]|\P{ASCII}/u;
const LETTER = { hangul: 0.87, narrow: 0.29, wide: 1, other: 0.67 };

function shareOf(letter: string): number {
  if (HANGUL.test(letter)) {
    return LETTER.hangul;
  }
  if (NARROW.test(letter)) {
    return LETTER.narrow;
  }
  return WIDE.test(letter) ? LETTER.wide : LETTER.other;
}

function wordsWidth(words: string, size: number): number {
  let width = 0;
  for (const letter of words) {
    width += shareOf(letter) * size;
  }
  return width;
}

// A label's box around its mark's point, in points, x to the right and y down, as `MapAnswerMark` lays it out: at its
// side of the symbol box, the gap and its `shift` away, and centred on the point the other way. Its width is its
// words' with the padding, the pick's border, and the number's badge, at most `LABEL_MAX`. The camera's room for
// labels and the choice of a label's side both read it.
export function answerLabelBox({
  side,
  tone,
  title,
  line,
  number,
  shift = 0,
  sub = null,
  note = null,
  action = null,
}: AnswerLabel): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const titleSize = tone === 'pick' ? mapText.buttonTitle.fontSize : mapText.rowLine.fontSize;
  const lineWords = line === null ? null : action === null ? line : `${line} ${action}`;
  const lineWidth = lineWords === null ? 0 : wordsWidth(lineWords, mapText.rowLine.fontSize);
  const titleWidth = wordsWidth(title, titleSize) + (note === null ? 0 : wordsWidth(` ${note}`, titleSize));
  const head =
    tone === 'candidate' && line !== null ? titleWidth + space[1] + lineWidth : Math.max(titleWidth, lineWidth);
  const words = Math.max(head, sub === null ? 0 : wordsWidth(sub, mapText.rowLine.fontSize));
  const frame = 2 * space[2] + (tone === 'pick' ? 2 * RING : 0) + (number === null ? 0 : BADGE + space[1]);
  const width = Math.ceil(Math.min(sub === null && tone !== 'pick' ? LABEL_MAX : SUB_MAX, frame + words));
  const height = (line === null || tone === 'candidate') && sub === null ? ONE_LINE : TWO_LINES;
  const reach = ANSWER_SYMBOL_BOX / 2 + GAP + shift;
  if (side === 'left' || side === 'right') {
    const left = side === 'right' ? reach : -reach - width;
    return { left, top: -height / 2, right: left + width, bottom: height / 2 };
  }
  const top = side === 'below' ? reach : -reach - height;
  return { left: -width / 2, top, right: width / 2, bottom: top + height };
}
