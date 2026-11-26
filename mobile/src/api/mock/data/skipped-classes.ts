/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MealInput } from '@/api/assistant-types';
import type { SkippedClass } from '@/api/time-band-types';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from './meal-answer';

// The stored answer to "배고파, 민수랑 같이" (Tuesday 2026-11-17) as a main server since P05's Classes left out answers
// it when the User says a Class is cancelled (P04 ticket 93): those Classes out of 나's lane and in each band's
// `skipped`, their ids in the input, and the range reaching to lunch's end at 14:30. 나's day here: 301동 until 11:50,
// 24동 13:00–14:15, and, for the line that overflows, 09:00, 15:00 and 16:30 Classes too. The mock does not plan, so the
// Plans stay as they were.

const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const LUNCH_END = at('14:30');

const MORNING: SkippedClass = {
  id: '5c1a7e00-0000-4000-8000-000000000900',
  startAt: at('09:00'),
  endAt: at('10:15'),
  label: '83동 수업',
};
const BEFORE_LUNCH: SkippedClass = {
  id: '5c1a7e00-0000-4000-8000-000000001030',
  startAt: at('10:30'),
  endAt: at('11:50'),
  label: '301동 수업',
};
export const ONE_PM: SkippedClass = {
  id: '5c1a7e00-0000-4000-8000-000000001300',
  startAt: at('13:00'),
  endAt: at('14:15'),
  label: '24동 수업',
};
export const THREE_PM: SkippedClass = {
  id: '5c1a7e00-0000-4000-8000-000000001500',
  startAt: at('15:00'),
  endAt: at('16:15'),
  label: '302동 수업',
};
const HALF_FOUR: SkippedClass = {
  id: '5c1a7e00-0000-4000-8000-000000001630',
  startAt: at('16:30'),
  endAt: at('17:45'),
  label: '43-1동 수업',
};

const overlaps = (busy: { startAt: string; endAt: string }, skipped: SkippedClass): boolean =>
  new Date(busy.startAt) < new Date(skipped.endAt) && new Date(busy.endAt) > new Date(skipped.startAt);

const later = (a: string, b: string): string => (new Date(a) > new Date(b) ? a : b);

// The stored answer with those Classes of 나's left out.
export function leftOut(skipped: readonly SkippedClass[]): AnswerReply & { input: MealInput } {
  const input: MealInput = { ...MEAL_ANSWER.input, skipped: skipped.map(({ id }) => id) };
  const plans = MEAL_ANSWER.plans.map((plan) => {
    const [mine, ...theirs] = plan.band.lanes;
    const busy = (mine?.busy ?? []).filter((stretch) => !skipped.some((one) => overlaps(stretch, one)));
    const lanes = mine === undefined ? theirs : [{ ...mine, busy }, ...theirs];
    const range = { ...plan.band.range, endAt: later(plan.band.range.endAt, LUNCH_END) };
    return { ...plan, band: { ...plan.band, range, lanes, skipped: [...skipped] } };
  });
  return { ...MEAL_ANSWER, input, plans };
}

type SkippedReply = AssistantReply & { answer: AnswerReply & { input: MealInput } };

function replyOf(text: string, skipped: readonly SkippedClass[]): SkippedReply {
  return { ...MEAL_ANSWER_REPLY, text, answer: leftOut(skipped) };
}

export const ONE_SKIPPED_REPLY = replyOf('1시 수업을 빼고, 민수와 가장 덜 걷는 302동식당을 추천해요.', [ONE_PM]);

export const TWO_SKIPPED_REPLY = replyOf('오후 수업 둘을 빼고, 민수와 가장 덜 걷는 302동식당을 추천해요.', [
  ONE_PM,
  THREE_PM,
]);

export const FIVE_SKIPPED_REPLY = replyOf('수업 다섯을 빼고, 민수와 가장 덜 걷는 302동식당을 추천해요.', [
  MORNING,
  BEFORE_LUNCH,
  ONE_PM,
  THREE_PM,
  HALF_FOUR,
]);

// The words the mock answers with Classes left out: a whole day's, the afternoon's, or one.
export function skippedReplyTo(words: string): SkippedReply | null {
  if (!words.includes('휴강')) {
    return null;
  }
  if (words.includes('다 휴강') && !words.includes('오후')) {
    return FIVE_SKIPPED_REPLY;
  }
  return words.includes('오후') ? TWO_SKIPPED_REPLY : ONE_SKIPPED_REPLY;
}
