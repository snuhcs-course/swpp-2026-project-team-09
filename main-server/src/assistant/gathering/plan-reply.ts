/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CuisineWord } from '../../menus/cuisine-words.js';
import { type AnswerReply, type Plan } from '../dto/answer.dto.js';
import { hasFinal, withSubject } from './answer-words.js';
import { nextItemWords, shownWalk } from './plan-order.js';

// A sentence that gives someone's walk in minutes ("83동에서 도보 3분이에요", "걸어서 5분 걸려요"): the app draws the
// ways and writes their minutes on the map, and nowhere else (the meal rules: nobody's minutes on the way).
const WALK_MINUTES = /(?:도보|걸어서|걸음으로|걸음)\s*\d+\s*분|\d+\s*분\s*(?:정도\s*)?(?:걸려|걸어|거리)/u;

// A reply's sentences, each with what ends it and the space after it.
const SENTENCES = /[^.!?]+(?:[.!?]+\s*|$)/gu;

// The reply, when its answer draws a Plan, without a sentence after the first that gives a walk in minutes. On the
// user's phone (2026-11-26), "저녁" was answered "예술계식당이 가장 가까워서 17:00에 먹어요. 83동에서 도보 3분이에요."
// although the rules ask for one sentence. The first sentence always stays, and so do the others the rules allow: a
// question back, fellBack's, a meal already set. A reply with no Plan on screen, such as a way's, is left as it is.
export function withoutWalkSentences(text: string, drawsPlan: boolean): string {
  if (!drawsPlan) {
    return text;
  }
  const [first = '', ...rest] = text.match(SENTENCES) ?? [];
  return [first, ...rest.filter((sentence) => !WALK_MINUTES.test(sentence))].join('').trim();
}

// The sentence of a meal reply the model wrote no words for, the rules' one sentence made from the plans: the first plan
// recommended by its Restaurant's name with why it comes first, as the order has it. Without it the reply went back as
// the stand-in, and the app put the plan's own line in its place ("301동식당 · 11:30 · 걸음 4분 · 돌솥비빔밥 · 6,500원",
// the user's phone, 2026-11-26). A menu's answer, opened at its Restaurant, recommends nothing: none for it.
export function wordlessMealSentence(answer: AnswerReply | null): string | null {
  if (answer === null || answer.input.kind !== 'meal' || answer.opened !== undefined) {
    return null;
  }
  const [first, ...rest] = answer.plans;
  if (first === undefined) {
    return null;
  }
  // A name's bracketed part is not read for the particle: 아워홈(901동)을.
  const read = first.id.replace(/\s*\([^)]*\)$/u, '');
  return `${whyFirst(first, rest, answer.input.cuisine)}${first.id}${hasFinal(read) ? '을' : '를'} 추천해요.`;
}

// Why the first plan comes first, in the rules' words, or nothing when none can be said truly: the kind of food it
// serves; the least walking, on to the User's next item when where they set out from is not known, said only when no
// other plan walks less; or, with neither origin nor next item, the earliest start.
function whyFirst(first: Plan, rest: readonly Plan[], kind: CuisineWord | null | undefined): string {
  if (kind !== undefined && kind !== null && first.menu?.dishes.some(({ cuisine }) => cuisine === kind) === true) {
    return `${withSubject(kind)} 나오는 `;
  }
  const me = first.parts.find((part) => part.me);
  const next = me === undefined || me.origin !== null ? null : nextItemWords(first, me);
  if (me?.origin === null && next === null) {
    return '어디서 출발하는지 몰라서 가장 일찍 여는 ';
  }
  const least = rest.every((plan) => shownWalk(plan) >= shownWalk(first));
  if (!least) {
    return '';
  }
  return next === null ? '가장 덜 걷는 ' : `${next}까지 가장 덜 걷는 `;
}
