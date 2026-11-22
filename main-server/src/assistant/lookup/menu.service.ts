/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { MenusService } from '../../menus/menus.service.js';
import { servedLines } from '../../menus/open-rule.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type AnswerReply, type Lookup, type MealInput, type Plan } from '../dto/answer.dto.js';
import { type HandledMeal } from '../free-time/meal-fit.js';
import { MealPlanService } from '../gathering/meal-plan.service.js';
import { type HoursMeal, type MealOfDay } from './hours-words.js';
import { menuAnswer } from './menu-lookup.js';

export type MenuFound =
  | { result: 'found'; collectedAt: Date; lines: MenuLineDto[]; plan: Plan; lookup: Lookup }
  // No line collected for the meal, only notes, or no time to be there and eat. The lines are the meal's.
  | { result: 'none'; reason: 'no-menu' | 'closed' | 'no-time'; lines: MenuLineDto[] };

// Spaces and case do not count when a name is matched, as in getMenus.
const compact = (words: string): string => words.replaceAll(/\s/gu, '').toLowerCase();

// What a menu drawn on the map needs: the Restaurants on the map, their menus, and the meal Plan for the User alone.
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
    return Promise.all(
      meals.map(async (meal) => ({
        meal,
        lines: day?.meals.find((served) => served.meal === meal)?.lines ?? [],
        hours: await this.menus.hoursOf(key, meal, date),
      })),
    );
  }

  // The meal answer on screen planned again, so that a reply in words keeps it there.
  replan(userId: string, input: MealInput, at: { now: Date; location: Position | null }): Promise<AnswerReply> {
    return this.mealPlans.plan(userId, input, at);
  }

  async find(
    userId: string,
    ask: { date: string; meal: HandledMeal; key: string },
    at: { now: Date; location: Position | null },
  ): Promise<MenuFound> {
    const { date, meal, key } = ask;
    const place = this.restaurantPlaces.placeOf(key);
    if (place === null) {
      throw new Error(`No Place of ${key}`);
    }
    const day = (await this.menus.findByDate(date)).find(({ name }) => name === key);
    const lines = day?.meals.find((served) => served.meal === meal)?.lines ?? [];
    if (day === undefined || lines.length === 0) {
      return { result: 'none', reason: 'no-menu', lines };
    }
    if (servedLines(lines).length === 0) {
      return { result: 'none', reason: 'closed', lines };
    }
    const answer = await this.mealPlans.plan(
      userId,
      {
        kind: 'meal',
        date,
        meal,
        people: [{ userId, constraints: [] }],
        window: { from: null, until: null },
        placeId: place.id,
      },
      at,
    );
    const [hours, cuisines] = await Promise.all([this.menus.hoursOf(key, meal, date), this.menus.cuisinesOf(lines)]);
    const found = menuAnswer({ key, date, meal, now: at.now, lines, answer, hours, cuisines });
    if (found.result === 'none') {
      return { result: 'none', reason: found.reason, lines };
    }
    return { ...found, collectedAt: day.collectedAt, lines };
  }
}
