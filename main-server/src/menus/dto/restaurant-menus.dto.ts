import { Meal, MenuLine, MenuLineKind, RestaurantDay } from '../../generated/prisma/client.js';

export interface MenuLineDto {
  text: string;
  kind: MenuLineKind | null;
  price: number | null;
}

export interface MealMenusDto {
  meal: Meal;
  lines: MenuLineDto[];
}

export interface RestaurantMenusDto {
  restaurant: string;
  collectedAt: Date;
  // Only the meals that have lines, in the order of the day.
  meals: MealMenusDto[];
}

// Takes the lines ordered by position.
export function toRestaurantMenusDto(day: RestaurantDay & { lines: MenuLine[] }): RestaurantMenusDto {
  const meals = Object.values(Meal).flatMap((meal) => {
    const lines = day.lines
      .filter((line) => line.meal === meal)
      .map(({ text, kind, price }) => ({ text, kind, price }));
    return lines.length === 0 ? [] : [{ meal, lines }];
  });
  return { restaurant: day.restaurant, collectedAt: day.collectedAt, meals };
}
