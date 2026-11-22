/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine, MenuDish, Plan } from '@/api/assistant-types';
import { won } from '@/features/dining/adapter';

export type PlanMenu = NonNullable<Plan['menu']>;

// The dishes in the menu's order, those of `kind` first.
export function dishesFirstOf(dishes: readonly MenuDish[], kind: Cuisine | null): MenuDish[] {
  if (kind === null) {
    return [...dishes];
  }
  return [...dishes.filter(({ cuisine }) => cuisine === kind), ...dishes.filter(({ cuisine }) => cuisine !== kind)];
}

// "뚝배기불고기 외 2", or the one dish's name; null without dishes.
export function dishWords({ dishes }: PlanMenu, kind: Cuisine | null = null): string | null {
  const [first, ...rest] = dishesFirstOf(dishes, kind);
  if (first === undefined) {
    return null;
  }
  return rest.length === 0 ? first.name : `${first.name} 외 ${rest.length}`;
}

// What a meal costs there: the corner's own price (a buffet's), else the lowest of the dishes' with "부터" when they
// differ; null when nothing has a price.
export function priceWords({ price, dishes }: PlanMenu): string | null {
  if (price !== null) {
    return won(price);
  }
  const prices = dishes.flatMap((dish) => (dish.price === null ? [] : [dish.price]));
  if (prices.length === 0) {
    return null;
  }
  const lowest = Math.min(...prices);
  return prices.some((one) => one !== lowest) ? `${won(lowest)}부터` : won(lowest);
}

// A candidate's second line: its first dish, the count of the rest, and its price ("뚝배기불고기 외 2 · 5,000원부터").
// Null without a menu or dishes.
export function menuLine(menu: PlanMenu | undefined, kind: Cuisine | null = null): string | null {
  if (menu === undefined) {
    return null;
  }
  const dishes = dishWords(menu, kind);
  if (dishes === null) {
    return null;
  }
  const price = priceWords(menu);
  return price === null ? dishes : `${dishes} · ${price}`;
}
