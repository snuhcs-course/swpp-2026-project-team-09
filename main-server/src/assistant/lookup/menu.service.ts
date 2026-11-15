/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { MenusService } from '../../menus/menus.service.js';
import { servedLines } from '../../menus/open-rule.js';
import { RestaurantPlaces } from '../../menus/restaurant-places.js';
import { type Lookup, type Plan } from '../dto/answer.dto.js';
import { type HandledMeal } from '../free-time/meal-fit.js';
import { MealPlanService } from '../gathering/meal-plan.service.js';
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
    const found = menuAnswer({ key, date, meal, now: at.now, lines, answer });
    if (found.result === 'none') {
      return { result: 'none', reason: found.reason, lines };
    }
    return { ...found, collectedAt: day.collectedAt, lines };
  }
}
