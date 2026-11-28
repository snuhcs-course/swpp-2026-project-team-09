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
import { ASKED, askPast, offeredWords, pastOffers, type PastAsk, TODAY_LABEL } from '../past-time.js';
import { withdrawAnswer } from '../taken-off.js';
import { withAnd, withToward } from './answer-words.js';

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

// The question of a meal over today, its buttons asking with the same Friends: tomorrow's meal of the one the User named,
// else lunch, and today from now while dinner is still to come.
export function mealAsk(
  named: Meal | undefined,
  { laterToday }: { laterToday: boolean },
  friendNames: readonly string[],
): PastAsk {
  const last = friendNames.at(-1);
  const together = last === undefined ? '' : `${[...friendNames.slice(0, -1), withAnd(last)].join(', ')} `;
  return {
    named: named === undefined ? '식사 시간' : `${MEAL_WORDS[named]} 시간`,
    tomorrow: `${together}내일 ${withToward(MEAL_WORDS[named ?? 'lunch'])} 해 줘`,
    today: laterToday ? `${together}${TODAY_LABEL} 해 줘` : null,
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
// back whether to plan it tomorrow or today from now, as any time of today that has passed does; named by no time, as a
// request for now, it offers the same buttons beside the reply.
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
  presented.offers = pastOffers(ask);
  return { result: 'none', meal: input.meal, reason: offeredWords(ask) };
}
