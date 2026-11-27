/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Lookup, type PlanInput } from './dto/answer.dto.js';
import { type Presented } from './feature.js';
import { isTogether } from './lookup/study-group.js';

// The one way a tool changes what a reply draws on the map: an answer, a Lookup, or nothing. A tool never writes those
// fields of `Presented` itself.
//
// Two views are kept. `answer` is the one slot every app reads, as it always was: the answer a tool put there last,
// which a Lookup after it takes away. `answers` holds one answer per request of the message (P05 ticket 73), so that
// "점심이랑 저녁 짜줘" keeps both: an answer replaces one of the same request and is added after the others otherwise,
// and a Lookup leaves them.

type Drawn = Pick<Presented, 'answer' | 'answers' | 'withdrawn' | 'lookup' | 'mapButtons' | 'clears'>;

// Which request of the message an answer answers: its kind and day, and for a meal the meal, for a study plan whether
// it is together. Quests have no day of their own: those of one Global Event are one request.
export function requestKey(input: PlanInput): string {
  if (input.kind === 'meal') {
    return `meal ${input.date} ${input.meal}`;
  }
  if (input.kind === 'study') {
    return `study ${input.date} ${isTogether(input) ? 'together' : 'alone'}`;
  }
  if (input.kind === 'quests') {
    return `quests ${input.globalEventId ?? 'chosen'}`;
  }
  return `${input.kind} ${input.date}`;
}

const sameRequest = (a: PlanInput, b: PlanInput): boolean => requestKey(a) === requestKey(b);

// The answers with this one in the place of the one of its request, or after them.
function withAnswer(answers: readonly AnswerReply[], answer: AnswerReply): AnswerReply[] {
  const at = answers.findIndex(({ input }) => sameRequest(input, answer.input));
  return at === -1 ? [...answers, answer] : answers.with(at, answer);
}

// A tool about to draw takes the map: the Lookup and the layer buttons leave it.
export function takeMap(presented: Drawn): void {
  presented.lookup = null;
  presented.mapButtons.length = 0;
}

export function presentAnswer(presented: Drawn, answer: AnswerReply): void {
  takeMap(presented);
  presented.answer = answer;
  presented.answers = withAnswer(presented.answers ?? [], answer);
  if (presented.withdrawn !== undefined) {
    presented.withdrawn = presented.withdrawn.filter((key) => key !== requestKey(answer.input));
  }
}

// `keepsButtons`: a Lookup that stands beside the layer buttons, such as a closed 관정도서관's. The answers of the
// message's other requests stay.
export function presentLookup(presented: Drawn, lookup: Lookup, { keepsButtons = false } = {}): void {
  if (!keepsButtons) {
    presented.mapButtons.length = 0;
  }
  presented.lookup = lookup;
  presented.answer = null;
}

// A request for a plan ended with none drawn: its answer leaves the reply, and the plan on screen leaves the map too
// (P05 ticket 55). The answers of the message's other requests stay; an app that says `answers` is told its key.
export function withdrawAnswer(presented: Drawn, input: PlanInput): void {
  takeMap(presented);
  presented.answer = null;
  presented.clears = true;
  if (presented.answers !== undefined) {
    presented.answers = presented.answers.filter((answer) => !sameRequest(answer.input, input));
  }
  const key = requestKey(input);
  presented.withdrawn = [...(presented.withdrawn ?? []).filter((each) => each !== key), key];
}

// Nothing drawn, so that a button under the text stands alone.
export function clearDrawn(presented: Drawn): void {
  takeMap(presented);
  presented.answer = null;
  presented.answers = [];
}

// The answer drawn changed by the server after its tool presented it, such as a meal planned again from the step before
// it, in both views: in the place of the answer it changes, even when the change makes it another request. Nothing when
// none is drawn.
export function reviseAnswer(presented: Drawn, change: (answer: AnswerReply) => AnswerReply): void {
  const { answer } = presented;
  if (answer === null) {
    return;
  }
  const changed = change(answer);
  const answers = presented.answers ?? [];
  const at = answers.findIndex(({ input }) => sameRequest(input, answer.input));
  presented.answer = changed;
  presented.answers = at === -1 ? withAnswer(answers, changed) : answers.with(at, changed);
}
