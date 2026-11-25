/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { MenusService } from '../../menus/menus.service.js';
import { servedLines } from '../../menus/open-rule.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type AnswerReply, type Lookup, type Plan } from '../dto/answer.dto.js';
import { type LocationMissing } from '../refusals/refusal.dto.js';
import { type HandledMeal } from '../free-time/meal-fit.js';
import { MealPlanService } from '../gathering/meal-plan.service.js';
import { type HoursMeal, type MealOfDay } from './hours-words.js';
import { menuAnswer, menuNoneLookup, type NoMenuReason } from './menu-lookup.js';

export type MenuFound =
  // The meal answer opened at the Restaurant (P04 ticket 72).
  | { result: 'found'; collectedAt: Date; lines: MenuLineDto[]; plan: Plan; answer: AnswerReply }
  // The day not collected, collected without the meal (P04 ticket 60), only notes, or no time to be there and eat. The lines are the meal's, and the
  // Lookup draws the Restaurant with why (P04 ticket 59).
  | { result: 'none'; reason: NoMenuReason; lines: MenuLineDto[]; lookup: Lookup };

// Spaces and case do not count when a name is matched, as in getMenus.
const compact = (words: string): string => words.replaceAll(/\s/gu, '').toLowerCase();

// What a menu question needs: the Restaurants on the map, their menus, and the meal's answer for the User alone.
@Injectable()
export class MenuLookupService {
  constructor(
    private readonly menus: MenusService,
    private readonly restaurantPlaces: RestaurantPlaces,
    private readonly mealPlans: MealPlanService,
  ) {}

  // The Restaurants with a Place whose name holds the words; the one named exactly by them when there is one.
  named(words: string): string[] {
    const names = this.restaurantPlaces.names();
    const exactly = names.filter((name) => compact(name) === compact(words));
    return exactly.length === 1 ? exactly : names.filter((name) => compact(name).includes(compact(words)));
  }

  // The Restaurants that stand at the Place.
  at(placeId: string): string[] {
    return this.restaurantPlaces.names().filter((name) => this.restaurantPlaces.placeOf(name)?.id === placeId);
  }

  // Each meal's lines of the Restaurant's menu on the day, empty when none was collected, with its hours for that kind
  // of day.
  async mealsOf(key: string, date: string): Promise<MealOfDay[]> {
    const day = (await this.menus.findByDate(date)).find(({ name }) => name === key);
    const meals: HoursMeal[] = ['breakfast', 'lunch', 'dinner'];
    const posted = day?.meals.some(({ lines }) => lines.length > 0) ?? false;
    return Promise.all(
      meals.map(async (meal) => ({
        meal,
        posted,
        lines: day?.meals.find((served) => served.meal === meal)?.lines ?? [],
        hours: await this.menus.hoursOf(key, meal, date),
      })),
    );
  }

  // The Place of the Restaurant, null when it has none.
  placeOf(key: string): PlaceDto | null {
    return this.restaurantPlaces.placeOf(key);
  }

  async find(
    userId: string,
    ask: { date: string; meal: HandledMeal; key: string },
    // As planMeal plans: the User's location or why it is missing, and whether the app sets a held meal aside.
    at: { now: Date; location: Position | null; locationMissing?: LocationMissing; setsAside?: boolean },
  ): Promise<MenuFound> {
    const { date, meal, key } = ask;
    const place = this.restaurantPlaces.placeOf(key);
    if (place === null) {
      throw new Error(`No Place of ${key}`);
    }
    const day = (await this.menus.findByDate(date)).find(({ name }) => name === key);
    const lines = day?.meals.find((served) => served.meal === meal)?.lines ?? [];
    const none = (reason: NoMenuReason): MenuFound => ({
      result: 'none',
      reason,
      lines,
      lookup: menuNoneLookup({ key, date, meal, now: at.now, lines }, reason, place),
    });
    if (day === undefined) {
      return none('no-menu');
    }
    if (lines.length === 0) {
      return none(day.meals.some((served) => served.lines.length > 0) ? 'no-meal' : 'no-menu');
    }
    if (servedLines(lines).length === 0) {
      return none('closed');
    }
    const answer = await this.mealPlans.plan(
      userId,
      {
        kind: 'meal',
        date,
        meal,
        people: [{ userId, constraints: [] }],
        window: { from: null, until: null },
        // The whole meal, as planMeal plans it, so that the answer opened at the Restaurant leads back to every place
        // the User can eat at (P04 ticket 72).
        placeId: null,
      },
      at,
    );
    const found = menuAnswer({ key, date, meal, now: at.now, lines, answer });
    if (found.result === 'none') {
      return none(found.reason);
    }
    return { ...found, collectedAt: day.collectedAt, lines };
  }
}
