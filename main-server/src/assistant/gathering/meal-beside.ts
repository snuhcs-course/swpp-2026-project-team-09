/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RestaurantMenusDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type AnswerReply } from '../dto/answer.dto.js';
import { type MealInput } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { closedRestaurants, openRestaurants } from '../free-time/meal-tools.js';

// What a meal's answer names beside its plans from the day's menus (moved out of `meal-plan.service.ts` for its length):
// the other meal of the day, and the Restaurants closed for this one, which the list names apart (P04 ticket 67).
export function besideOf(
  collected: readonly RestaurantMenusDto[],
  input: MealInput,
  { now, restaurantPlaces }: { now: Date; restaurantPlaces: RestaurantPlaces },
): Pick<AnswerReply, 'otherMeal' | 'closed'> {
  const closed = closedRestaurants(collected, input.meal, restaurantPlaces);
  return {
    otherMeal: otherMealOf(collected, input, { now, restaurantPlaces }),
    ...(closed.length > 0 ? { closed } : {}),
  };
}

// The other meal of the day, which the app's bar offers, and when it starts: its window's start, or now when it is under
// way. None when it is over, or when no Restaurant with a Place serves it that day.
function otherMealOf(
  collected: readonly RestaurantMenusDto[],
  { date, meal }: MealInput,
  { now, restaurantPlaces }: { now: Date; restaurantPlaces: RestaurantPlaces },
): AnswerReply['otherMeal'] {
  const other = meal === 'lunch' ? 'dinner' : 'lunch';
  const { start, end } = mealWindow(date, other);
  if (end <= now || openRestaurants(collected, other, restaurantPlaces).length === 0) {
    return null;
  }
  return { meal: other, start: clockOf(start < now ? now : start) };
}
