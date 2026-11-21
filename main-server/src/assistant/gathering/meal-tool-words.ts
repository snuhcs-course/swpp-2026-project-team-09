/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type CuisineWord } from '../../menus/cuisine-words.js';
import { type AnswerReply, type Plan } from '../dto/answer.dto.js';
import { othersText } from '../others-text.js';
import { type BusyItem } from './meal-plan.service.js';

// What planMeal tells the model beside the plans: the Restaurants that serve the kind of food on screen, the meal the
// User already put in their schedule, and the User's items that fill the meal's time when none is free.

const clock = (time: string): string => time.slice(11, 16);

// The Restaurants of the plans whose main corner serves the kind of food, which come first.
export const servingKind = (plans: readonly Plan[], kind: CuisineWord): string[] =>
  plans.filter(({ menu }) => menu?.dishes.some(({ cuisine }) => cuisine === kind) === true).map(({ id }) => id);

// The meal the User already put in their schedule, which the plans set aside and making one replaces.
export function alreadySetWords(mealSet: AnswerReply['mealSet']): object {
  if (mealSet === null || mealSet === undefined) {
    return {};
  }
  const { startAt, place, friendNames: others, shared } = mealSet;
  return {
    alreadySet: {
      start: clock(startAt),
      place: othersText('quest.place', place),
      with: others.map((name) => othersText('friend.name', name)),
      shared,
    },
  };
}

// The User's own items that fill the meal's time, when no time is free.
export const busyWords = (busy: readonly BusyItem[]): object =>
  busy.length === 0
    ? {}
    : {
        busy: busy.map(({ name, isClass, start, end }) => ({
          what: isClass ? name : othersText('quest.title', name),
          isClass,
          start,
          end,
        })),
      };
