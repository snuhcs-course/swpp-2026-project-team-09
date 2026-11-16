/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReplyOffer } from '../dto/assistant-messages.dto.js';
import { type MealInput } from '../dto/answer.dto.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { koreaDate } from '../korea-time.js';
import { addDays } from '../library/booking-rules.js';
import { withAnd } from './answer-words.js';

// A meal asked for after it is over today ("배고파" at 21:20): no plan can be drawn, so the reply offers the next meal
// as a button instead of an answer with nothing to change.

export interface NextMeal {
  date: string;
  meal: MealInput['meal'];
  words: string;
}

// Today's dinner after lunch, else tomorrow's lunch; null while the meal asked for is not over, or for another day.
export function mealAfter({ date, meal }: Pick<MealInput, 'date' | 'meal'>, now: Date): NextMeal | null {
  if (date !== koreaDate(now) || now < mealWindow(date, meal).end) {
    return null;
  }
  if (meal === 'lunch' && now < mealWindow(date, 'dinner').end) {
    return { date, meal: 'dinner', words: '오늘 저녁' };
  }
  return { date: addDays(date, 1), meal: 'lunch', words: '내일 점심' };
}

// "내일 점심 보기", which asks for that meal with the same Friends.
export function nextMealOffer({ words }: NextMeal, friendNames: readonly string[]): ReplyOffer {
  const last = friendNames.at(-1);
  const together = last === undefined ? '' : `${[...friendNames.slice(0, -1), withAnd(last)].join(', ')} `;
  return { kind: 'ask', label: `${words} 보기`, text: `${together}${words} 어디서 먹을까?` };
}
