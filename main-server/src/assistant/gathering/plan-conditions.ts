/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MealInput, type PersonConstraint } from '../dto/answer.dto.js';
import { onDay } from '../free-time/free-time.js';
import { earliest, type Interval, latest, mealWindow } from '../free-time/meal-fit.js';
import { type GatheringPerson } from './gathering.js';

// What the User fixed in a plan's input, as the calculation takes it.

export type PersonConditions = Pick<GatheringPerson, 'chosenPlaceId' | 'notBefore' | 'leaveBy'>;

// The meal's window when its food is served, narrowed by the start the User fixed: the end the User fixed ends the meal,
// not its serving (P05 ticket 46).
export function servingWindowOf({ date, meal, window }: MealInput): Interval {
  const { start, end } = mealWindow(date, meal);
  return { start: window.from === null ? start : latest([start, onDay(date, window.from)]), end };
}

// The end the User fixed for the meal, or null.
export const untilOf = ({ date, window }: MealInput): Date | null =>
  window.until === null ? null : onDay(date, window.until);

// The meal's window narrowed on each side the User fixed. It may come out empty.
export function windowOf({ date, meal, window }: MealInput): Interval {
  const { start, end } = mealWindow(date, meal);
  return {
    start: window.from === null ? start : latest([start, onDay(date, window.from)]),
    end: window.until === null ? end : earliest([end, onDay(date, window.until)]),
  };
}

// A person's constraints. Of several of a kind, the last origin, the latest "not before", and the earliest "leave by"
// hold.
export function conditionsOf(constraints: readonly PersonConstraint[], date: string): PersonConditions {
  const conditions: PersonConditions = {};
  for (const constraint of constraints) {
    if (constraint.kind === 'from') {
      conditions.chosenPlaceId = constraint.placeId;
    } else if (constraint.kind === 'notBefore') {
      const at = onDay(date, constraint.time);
      conditions.notBefore = conditions.notBefore === undefined ? at : latest([conditions.notBefore, at]);
    } else {
      const at = onDay(date, constraint.time);
      conditions.leaveBy = conditions.leaveBy === undefined ? at : earliest([conditions.leaveBy, at]);
    }
  }
  return conditions;
}
