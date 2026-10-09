// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26
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
  collectedAt: Date;
  // Only the meals that have lines, in the order of the day.
  meals: MealDto[];
}

// Takes the lines ordered by position.
export function toRestaurantMenusDto(day: RestaurantDay & { lines: MenuLine[] }): RestaurantMenusDto {
  const meals = Object.values(Meal).flatMap((meal) => {
    const lines = day.lines
      .filter((line) => line.meal === meal)
      .map(({ text, kind, name, price }) => ({ text, kind, name, price }));
    return lines.length === 0 ? [] : [{ meal, lines }];
  });
  return { name: day.restaurant, collectedAt: day.collectedAt, meals };
}
