/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { hasPhoto, type MarkerLook } from './marker-looks';

// The order the stage makes pictures in (P04 ticket 81): an answer's chosen place first, its numbered places next by
// their numbers and their minutes after them (P04 ticket 83), then the rest of the answer, then every other look;
// within each, the order they were asked in. A look asked for ahead of its need (`LATER`), as the other Plans' boards
// for a choice to come or the numbered dots made on the everyday map, waits behind every look a screen shows now.
export const LATER = 10;
// A candidate's minutes, after every numbered round (1 + number / 1000).
const MINUTES_RANK = 1.5;

export function rankOf(look: MarkerLook): number {
  if (look.kind !== 'answer') {
    return 3;
  }
  const { symbol, label } = look;
  if (symbol?.type === 'dot' && symbol.role === 'pick') {
    return 0;
  }
  if (label?.tone === 'minutes' && label.number === null) {
    return MINUTES_RANK;
  }
  const dotNumber = symbol?.type === 'dot' && symbol.role === 'candidate' ? symbol.number : null;
  // A meal candidate without a round of its own carries its number in its capsule (P04 ticket 83).
  const number = label?.tone === 'candidate' || label?.tone === 'minutes' ? label.number : dotNumber;
  return number === null ? 2 : 1 + number / 1000;
}

export function inCaptureOrder(looks: readonly MarkerLook[], rank: (look: MarkerLook) => number): MarkerLook[] {
  return looks.toSorted((one, other) => rank(one) - rank(other));
}

// How many looks without a photo the stage draws at once. Each is captured as soon as it is laid out, and the captures
// of one screen come back one after another, so a few at a time keeps the order and brings the first ones sooner. A
// look that waits for its photo is drawn at once beside them, and takes no turn while it waits.
export const AT_ONCE = 3;

export function onStage(waiting: readonly MarkerLook[]): MarkerLook[] {
  let plain = 0;
  return waiting.filter((look) => {
    if (hasPhoto(look)) {
      return true;
    }
    plain += 1;
    return plain <= AT_ONCE;
  });
}
