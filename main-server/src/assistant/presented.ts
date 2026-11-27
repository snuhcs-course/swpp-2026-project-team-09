/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Lookup } from './dto/answer.dto.js';
import { type Presented } from './feature.js';

// The one way a tool changes what a reply draws on the map: an answer, a Lookup, or nothing. A tool never writes those
// fields of `Presented` itself.

type Drawn = Pick<Presented, 'answer' | 'lookup' | 'mapButtons' | 'clears'>;

// A tool about to draw takes the map: the Lookup and the layer buttons leave it.
export function takeMap(presented: Drawn): void {
  presented.lookup = null;
  presented.mapButtons.length = 0;
}

export function presentAnswer(presented: Drawn, answer: AnswerReply): void {
  takeMap(presented);
  presented.answer = answer;
}

// `keepsButtons`: a Lookup that stands beside the layer buttons, such as a closed 관정도서관's.
export function presentLookup(presented: Drawn, lookup: Lookup, { keepsButtons = false } = {}): void {
  if (!keepsButtons) {
    presented.mapButtons.length = 0;
  }
  presented.lookup = lookup;
  presented.answer = null;
}

// A request for a plan ended with none drawn: the plan on screen leaves the map too (P05 ticket 55).
export function withdrawAnswer(presented: Drawn): void {
  takeMap(presented);
  presented.answer = null;
  presented.clears = true;
}

// Nothing drawn, so that a button under the text stands alone.
export function clearDrawn(presented: Drawn): void {
  takeMap(presented);
  presented.answer = null;
}

// The answer drawn changed by the server after its tool presented it, such as a meal planned again from the step before
// it. Nothing when none is drawn.
export function reviseAnswer(presented: Pick<Presented, 'answer'>, change: (answer: AnswerReply) => AnswerReply): void {
  if (presented.answer !== null) {
    presented.answer = change(presented.answer);
  }
}
