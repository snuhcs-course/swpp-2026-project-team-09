/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PersonConstraint, type PlanInput } from '../dto/answer.dto.js';
import { onDay } from '../free-time/free-time.js';
import { earliest, type Interval, latest, mealWindow } from '../free-time/meal-fit.js';
import { type GatheringPerson } from './gathering.js';

// What the User fixed in a plan's input, as the calculation takes it.

export type PersonConditions = Pick<GatheringPerson, 'chosenPlaceId' | 'notBefore' | 'leaveBy'>;

// The meal's window narrowed on each side the User fixed. It may come out empty.
export function windowOf({ date, meal, window }: PlanInput): Interval {
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
