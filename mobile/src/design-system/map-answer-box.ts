/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
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
// A meal answer's chosen place (P04 ticket 74): its name and start over its main dish, as wide as its longer line up to
// about half the map's width, the dish cut short with "…" past it.
export const MEAL_PICK_MAX = 200;
// The widest any such label grows with a large font: the narrowest phone laid out for, 360, less the map's margins.
export const PICK_TIME_CEILING = 320;

// A pick's label with its time is at most `MEAL_PICK_MAX` at the usual font size, and grows with the font scale as its
// words do, so that a large font does not cut its time (P01 ticket 30), up to `PICK_TIME_CEILING`.
export function pickTimeMax(fontScale: number): number {
  return Math.min(Math.round(MEAL_PICK_MAX * fontScale), PICK_TIME_CEILING);
}
export const RING = 2;
export const BADGE = 16;
// A candidate's numbered round, its white ring included; a meal candidate's has none, its coral rim its edge (P04
// ticket 91).
export const CANDIDATE_ROUND = 20;
// The number in a meal candidate's round, and in the meal list's badge, which reads as the same mark (P04 ticket 91).
export const MEAL_NUMBER = 13;
// A meal candidate's minutes capsule (P04 ticket 83): its height, and the width of its near end, which holds the
// candidate's numbered round with a little white around it; its edge's width.
export const CAPSULE = 26;
export const CAPSULE_EDGE = 1;

// A label's height, the tallest of its kind: one line of the pick's title with the padding and the pick's border at
// the top and at the bottom, or that title and a line under it.
// The words scale with the phone's font size (`fontScale`); the padding and the border do not.
function oneLine(scale: number): number {
  return mapText.buttonTitle.lineHeight * scale + 2 * GAP + 2 * RING;
}

function twoLines(scale: number): number {
  return (mapText.buttonTitle.lineHeight + mapText.rowLine.lineHeight) * scale + 2 * space[1] + 2 * RING;
}
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

// How wide a label may be: a meal pick's (`note`, its time) about half the map at the usual font size, a pick's or one
// with dishes under it wider, others narrower.
function widestOf(tone: AnswerLabel['tone'], sub: string | null, note: string | null, fontScale: number): number {
  if (tone === 'pick' && note !== null) {
    return pickTimeMax(fontScale);
  }
  return sub === null && tone !== 'pick' ? LABEL_MAX : SUB_MAX;
}

// A minutes capsule's width and height, its near end included.
function capsuleSize(title: string, fontScale: number): { width: number; height: number } {
  const words = wordsWidth(title, mapText.smallTitle.fontSize * fontScale);
  return {
    width: Math.ceil(CAPSULE + space[1] + words + space[2] + CAPSULE_EDGE),
    height: Math.max(CAPSULE, mapText.smallTitle.lineHeight * fontScale + 2 * CAPSULE_EDGE),
  };
}

// A minutes capsule's box (P04 ticket 83): the capsule beyond its near end. The near end, `CAPSULE` wide, lies under
// the candidate's round, whose centre is the point, inside the round's own symbol box, which the other labels keep
// clear of already; the words follow at the side it runs to.
function capsuleBox(
  { side, title }: AnswerLabel,
  fontScale: number,
): { left: number; top: number; right: number; bottom: number } {
  const { width, height } = capsuleSize(title, fontScale);
  const beyond = width - CAPSULE / 2;
  const [left, right] = side === 'left' ? [-CAPSULE / 2 - beyond, -CAPSULE / 2] : [CAPSULE / 2, CAPSULE / 2 + beyond];
  return { left, top: -height / 2, right, bottom: height / 2 };
}

// A label's box around its mark's point, in points, x to the right and y down, as `MapAnswerMark` lays it out: at its
// side of the symbol box, the gap and its `shift` away, and centred on the point the other way. Its width is its
// words' with the padding, the pick's border, and the number's badge, at most `LABEL_MAX`. The camera's room for
// labels and the choice of a label's side both read it. `fontScale` is the phone's font size as a share of the usual,
// which the words are drawn at (a large system font makes every label larger).
export function answerLabelBox(
  { side, tone, title, line, number, shift = 0, sub = null, note = null, action = null }: AnswerLabel,
  fontScale = 1,
): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  if (tone === 'minutes' && number === null) {
    return capsuleBox({ side, tone, title, line, number }, fontScale);
  }
  // A meal candidate without a round of its own (P04 ticket 83): its capsule with its round inside, or the round alone.
  const held = title === '' ? { width: CANDIDATE_ROUND, height: CANDIDATE_ROUND } : capsuleSize(title, fontScale);
  if (tone === 'minutes') {
    return around(side, shift, held);
  }
  const titleSize = (tone === 'pick' ? mapText.buttonTitle.fontSize : mapText.rowLine.fontSize) * fontScale;
  const rowSize = mapText.rowLine.fontSize * fontScale;
  const lineWords = line === null ? null : action === null ? line : `${line} ${action}`;
  const lineWidth = lineWords === null ? 0 : wordsWidth(lineWords, rowSize);
  const titleWidth = wordsWidth(title, titleSize) + (note === null ? 0 : wordsWidth(` ${note}`, titleSize));
  const head =
    tone === 'candidate' && line !== null ? titleWidth + space[1] + lineWidth : Math.max(titleWidth, lineWidth);
  const words = Math.max(head, sub === null ? 0 : wordsWidth(sub, rowSize));
  const frame = 2 * space[2] + (tone === 'pick' ? 2 * RING : 0) + (number === null ? 0 : BADGE + space[1]);
  const width = Math.ceil(Math.min(widestOf(tone, sub, note, fontScale), frame + words));
  const height = (line === null || tone === 'candidate') && sub === null ? oneLine(fontScale) : twoLines(fontScale);
  return around(side, shift, { width, height });
}

// A box of that size at its side of the symbol box, the gap and its `shift` away, and centred on the point the other
// way.
function around(
  side: AnswerLabel['side'],
  shift: number,
  { width, height }: { width: number; height: number },
): { left: number; top: number; right: number; bottom: number } {
  const reach = ANSWER_SYMBOL_BOX / 2 + GAP + shift;
  if (side === 'left' || side === 'right') {
    const left = side === 'right' ? reach : -reach - width;
    return { left, top: -height / 2, right: left + width, bottom: height / 2 };
  }
  const top = side === 'below' ? reach : -reach - height;
  return { left: -width / 2, top, right: width / 2, bottom: top + height };
}
