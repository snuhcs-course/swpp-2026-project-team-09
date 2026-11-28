/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type MealInput, type RequestContext } from '../dto/answer.dto.js';
import { type Presented } from '../feature.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { koreaDate } from '../korea-time.js';
import { ASKED, askOffer, askPast, offeredWords, type PastAsk } from '../past-time.js';
import { withdrawAnswer } from '../taken-off.js';
import { hasFinal, withAnd, withToward } from './answer-words.js';

// A meal asked for after it is over today ("배고파" at 21:20, 점심 at 15:00): no plan can be drawn, so the reply asks
// back as for any time of today that has passed (P05 ticket 80), instead of an answer with nothing to change.

const MEAL_WORDS = { lunch: '점심', dinner: '저녁' } as const;

type Meal = keyof typeof MEAL_WORDS;

// Whether the meal planned today is over, and whether a later one is still to come today: dinner after lunch.
export function mealOver({ date, meal }: Pick<MealInput, 'date' | 'meal'>, now: Date): { laterToday: boolean } | null {
  if (date !== koreaDate(now) || now < mealWindow(date, meal).end) {
    return null;
  }
  return { laterToday: meal === 'lunch' && now < mealWindow(date, 'dinner').end };
}

// The question of a meal over today, its buttons asking with the same Friends: the next meal today while there is one,
// dinner after lunch, and the meal the User named on the next day, else lunch. "오늘 점심 시간은 지났어요. 오늘 저녁이나
// 내일 점심으로 볼까요?"
export function mealAsk(
  named: Meal | undefined,
  { laterToday }: { laterToday: boolean },
  friendNames: readonly string[],
): PastAsk {
  const last = friendNames.at(-1);
  const together = last === undefined ? '' : `${[...friendNames.slice(0, -1), withAnd(last)].join(', ')} `;
  const tomorrow = `내일 ${withToward(MEAL_WORDS[named ?? 'lunch'])}`;
  const later = MEAL_WORDS.dinner;
  const offers = [
    ...(laterToday ? [askOffer(`오늘 ${withToward(later)}`, `${together}오늘 ${withToward(later)} 해 줘`)] : []),
    askOffer(tomorrow, `${together}${tomorrow} 해 줘`),
  ];
  return {
    named: named === undefined ? '식사 시간' : `${MEAL_WORDS[named]} 시간`,
    question: `${laterToday ? `오늘 ${later}${hasFinal(later) ? '이나' : '나'} ` : ''}${tomorrow} 볼까요?`,
    offers,
  };
}

// A Friend's name as the chips write it, without " · 출발지 모름" or " · 위치 모름".
const friendNames = ({ chips }: AnswerReply): string[] =>
  chips.flatMap(({ kind, text }) => (kind === 'person' ? [text.split(' · ')[0] ?? text] : []));

// When the meal of no plan was asked for, and whether the User named it.
export interface MealAsked {
  now: Date;
  named: boolean;
  context: RequestContext;
  presented: Presented;
}

// What planMeal answers of a meal over for today, which leaves the map; null while it is not over. Named, the reply asks
// back with the next meal today and the same meal tomorrow, as any time of today that has passed asks (P05 ticket 80);
// named by no time, as a request for now, it offers the same buttons beside the reply.
export function mealOverToday(
  answer: AnswerReply,
  input: MealInput,
  { now, named, context, presented }: MealAsked,
): object | null {
  const over = mealOver(input, now);
  if (over === null) {
    return null;
  }
  withdrawAnswer(presented, input, context);
  const ask = mealAsk(named ? input.meal : undefined, over, friendNames(answer));
  if (named) {
    askPast(presented, ask);
    return { result: 'asked', meal: input.meal, reason: ASKED };
  }
  presented.offers = ask.offers;
  return { result: 'none', meal: input.meal, reason: offeredWords(ask) };
}
