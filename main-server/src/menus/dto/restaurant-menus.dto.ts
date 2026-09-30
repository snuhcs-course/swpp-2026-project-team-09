import { Meal, MenuEntry, RestaurantDay } from '../../generated/prisma/client.js';

export interface MenuEntryDto {
  name: string;
  price: number | null;
}

export interface MealMenusDto {
  meal: Meal;
  entries: MenuEntryDto[];
}

export interface RestaurantMenusDto {
  restaurant: string;
  operatingHours: string | null;
  collectedAt: Date;
  // Only the meals that have entries, in the order of the day.
  meals: MealMenusDto[];
}

// Takes the entries ordered by position.
export function toRestaurantMenusDto(day: RestaurantDay & { entries: MenuEntry[] }): RestaurantMenusDto {
  const meals = Object.values(Meal).flatMap((meal) => {
    const entries = day.entries.filter((entry) => entry.meal === meal).map(({ name, price }) => ({ name, price }));
    return entries.length === 0 ? [] : [{ meal, entries }];
  });
  return { restaurant: day.restaurant, operatingHours: day.operatingHours, collectedAt: day.collectedAt, meals };
}
