/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RestaurantMenusDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type RestaurantHours } from '../../menus/restaurant-hours.js';
import { type RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type AnswerReply, type ClosedPlace, type MealInput } from '../dto/answer.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { closedRestaurants, openRestaurants } from '../free-time/meal-tools.js';
import { type GatheringPerson, type GatheringTravel } from './gathering.js';
import { gatherMeal, withHours } from './unmet-plans.js';

// What a meal's answer names beside its plans from the day's menus (moved out of `meal-plan.service.ts` for its length):
// the other meal of the day, and the Restaurants closed for this one that would have been a candidate (P04 ticket 71).

export interface BesideServices {
  restaurantPlaces: RestaurantPlaces;
  hours: Pick<RestaurantHours, 'hoursOf'>;
  travel: GatheringTravel;
}

interface Asked {
  input: MealInput;
  now: Date;
  people: readonly [GatheringPerson, ...GatheringPerson[]];
}

export async function besideOf(
  collected: readonly RestaurantMenusDto[],
  asked: Asked,
  services: BesideServices,
): Promise<Pick<AnswerReply, 'otherMeal' | 'closed'>> {
  const closed = await closedFitting(collected, asked, services);
  const otherMeal = otherMealOf(collected, asked, services.restaurantPlaces);
  return { otherMeal, ...(closed.length > 0 ? { closed } : {}) };
}

// The Restaurants closed for the meal that would have been a candidate were they open, at the Place the input fixes if
// any: one that could not be reached and eaten at in the time anyway is not named (the user's word, 2026-11-26). Each is
// planned as a candidate is, with its usual hours for the meal on that kind of day, which are known though the day's
// menu closes it, or the meal's window when it has none.
async function closedFitting(
  collected: readonly RestaurantMenusDto[],
  { input, now, people }: Asked,
  { restaurantPlaces, hours, travel }: BesideServices,
): Promise<ClosedPlace[]> {
  const closed = closedRestaurants(collected, input.meal, restaurantPlaces).filter(
    ({ place }) => input.placeId === null || place.placeId === input.placeId,
  );
  if (closed.length === 0) {
    return [];
  }
  const candidates = closed.map(({ place }) => ({ key: place.label, placeId: place.placeId }));
  const own = await Promise.all(candidates.map(({ key }) => hours.hoursOf(key, input.meal, input.date)));
  const { places, ...served } = withHours(input, candidates, own);
  const { fits } = gatherMeal(people, places, { input, now, ...served }, travel).gathering;
  const fitting = new Set(fits.map(({ key }) => key));
  return closed.filter(({ place }) => fitting.has(place.label));
}

// The other meal of the day, which the app's bar offers, and when it starts: its window's start, or now when it is under
// way. None when it is over, or when no Restaurant with a Place serves it that day.
function otherMealOf(
  collected: readonly RestaurantMenusDto[],
  { input: { date, meal }, now }: Asked,
  restaurantPlaces: RestaurantPlaces,
): AnswerReply['otherMeal'] {
  const other = meal === 'lunch' ? 'dinner' : 'lunch';
  const { start, end } = mealWindow(date, other);
  if (end <= now || openRestaurants(collected, other, restaurantPlaces).length === 0) {
    return null;
  }
  return { meal: other, start: clockOf(start < now ? now : start) };
}
