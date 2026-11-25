/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Plan } from '@/api/assistant-types';
import { MEAL_NAMES } from '@/features/dining/adapter';
import { koreaDayWord, koreaMinutes } from '@/korea-time';

// When each meal's window opens on the main server, in minutes after midnight.
const MEAL_OPENS = { lunch: 11 * 60, dinner: 17 * 60 } as const;

// The words before a meal's span on the bar (board 26): the meal with its day ("내일(월) 점심"), or the meal alone today
// before it opens ("저녁"); left out while it is under way today, when the day word is the bar's own.
export function mealDayOf(answer: AnswerReply, plan: Plan): string | undefined {
  const { input } = answer;
  if (input.kind !== 'meal') {
    return undefined;
  }
  const now = new Date(plan.band.now);
  const day = koreaDayWord(plan.band.startAt, now);
  if (day === '' && koreaMinutes(now) >= MEAL_OPENS[input.meal]) {
    return undefined;
  }
  return day === '' ? MEAL_NAMES[input.meal] : `${day} ${MEAL_NAMES[input.meal]}`;
}
