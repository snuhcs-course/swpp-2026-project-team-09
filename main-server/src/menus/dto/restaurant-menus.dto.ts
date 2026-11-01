/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Meal, MenuLine, MenuLineKind, RestaurantDay } from '../../generated/prisma/client.js';

export interface MenuLineDto {
  text: string;
  kind: MenuLineKind | null;
  // A dish's text without its price, to show beside the price.
  name: string | null;
  price: number | null;
}

export interface MealDto {
  meal: Meal;
  lines: MenuLineDto[];
}

// One restaurant's menus on the day asked for.
export interface RestaurantMenusDto {
  name: string;
  // Its Place, by the restaurant seed. Null for a restaurant the seed does not hold.
  placeId: string | null;
  collectedAt: Date;
  // Only the meals that have lines, in the order of the day.
  meals: MealDto[];
}

// Takes the lines ordered by position.
export function toRestaurantMenusDto(
  day: RestaurantDay & { lines: MenuLine[] },
  placeId: string | null,
): RestaurantMenusDto {
  const meals = Object.values(Meal).flatMap((meal) => {
    const lines = day.lines
      .filter((line) => line.meal === meal)
      .map(({ text, kind, name, price }) => ({ text, kind, name, price }));
    return lines.length === 0 ? [] : [{ meal, lines }];
  });
  return { name: day.restaurant, placeId, collectedAt: day.collectedAt, meals };
}
