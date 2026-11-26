/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Plan, type RequestContext } from '../dto/answer.dto.js';
import { MAX_PRICE } from '../dto/plan-input.dto.js';
import { cheapestDish, mainMenu, type ServedMenu, won } from './meal-menu.js';

// The order of a meal's plans with a price condition (P05 ticket 53, the design page "밥 조건 두 가지" § 2): a ceiling
// puts the Restaurants whose list price is at or under it first, in their order, and the others after them; none
// fitting puts every one cheapest first; `cheapFirst` orders by price. A Restaurant with no price never fits and goes
// last when ordered by price, and with no price anywhere, as when the menus are not posted, the order stays.

export interface PriceCondition {
  maxPrice?: number;
  cheapFirst?: true;
}

// Whether a list price is at or under the ceiling; a Restaurant with no price never fits.
export function fitsUnder(price: number | null, maxPrice: number): boolean {
  return price !== null && price <= maxPrice;
}

function cheapestFirst<Fit>(fits: readonly Fit[], priceOf: (fit: Fit) => number | null): Fit[] {
  return fits.toSorted((one, other) => {
    const [a, b] = [priceOf(one), priceOf(other)];
    if (a === null || b === null) {
      return (a === null ? 1 : 0) - (b === null ? 1 : 0);
    }
    return a - b;
  });
}

export function priceOrder<Fit>(
  fits: readonly Fit[],
  { maxPrice, cheapFirst }: PriceCondition,
  priceOf: (fit: Fit) => number | null,
): Fit[] {
  if (fits.every((fit) => priceOf(fit) === null)) {
    return [...fits];
  }
  if (maxPrice === undefined) {
    return cheapFirst === true ? cheapestFirst(fits, priceOf) : [...fits];
  }
  const fitting = fits.filter((fit) => fitsUnder(priceOf(fit), maxPrice));
  if (fitting.length === 0) {
    return cheapestFirst(fits, priceOf);
  }
  const over = fits.filter((fit) => !fitsUnder(priceOf(fit), maxPrice));
  return [...(cheapFirst === true ? cheapestFirst(fitting, priceOf) : fitting), ...over];
}

// A Restaurant's list price for the meal from its collected menu, none without one.
export function servedPrice(menu: ServedMenu | undefined): number | null {
  return menu === undefined ? null : (cheapestDish(mainMenu(menu.lines, menu.cuisines))?.price ?? null);
}

export function planPrice({ menu }: Pick<Plan, 'menu'>): number | null {
  return menu === undefined ? null : (cheapestDish(menu)?.price ?? null);
}

// planMeal's price inputs, as the model gives them from the User's words.
export const PRICE_INPUTS = {
  maxPrice: z
    .union([z.number().int().positive().max(MAX_PRICE), z.literal('any')])
    .optional()
    .describe(
      "The highest price per person the User named, in won: 5000 for 5천원 이하 or 5천원까지, 10000 for 만원 안쪽, 6000 for 6천원 정도. The Restaurants whose list price is at or under it come first, the others after them. 'any' when they let price go (가격은 상관없어). Left out otherwise: the price on screen is kept.",
    ),
  cheapFirst: z
    .boolean()
    .optional()
    .describe(
      'True when the User wants it cheap (싼 데, 제일 싼 데, 가장 싼 걸로), with or without a price: the cheapest come first. False when they let price go. Left out otherwise: the order on screen is kept.',
    ),
};

// The price condition the User named, else the one on screen, kept across days and meals: a budget is the person's,
// unlike a kind of food. 'any' and false let it go.
export function priceConditionOf(
  asked: { maxPrice?: number | 'any' | undefined; cheapFirst?: boolean | undefined },
  { conditions }: RequestContext,
): PriceCondition {
  const shown = conditions?.kind === 'meal' ? conditions : null;
  const maxPrice = asked.maxPrice ?? shown?.maxPrice;
  const cheapFirst = asked.cheapFirst ?? shown?.cheapFirst === true;
  return {
    ...(maxPrice === undefined || maxPrice === 'any' ? {} : { maxPrice }),
    ...(cheapFirst ? { cheapFirst: true } : {}),
  };
}

// A plan's dish and price as the list shows them, and whether they fit the ceiling, for the model.
export function planPriceWords(plan: Plan, { maxPrice, cheapFirst }: PriceCondition): object {
  if (maxPrice === undefined && cheapFirst !== true) {
    return {};
  }
  const cheapest = plan.menu === undefined ? null : cheapestDish(plan.menu);
  return {
    ...(cheapest === null ? {} : { cheapest: `${cheapest.name} ${won(cheapest.price)}` }),
    ...(maxPrice === undefined ? {} : { fits: fitsUnder(cheapest?.price ?? null, maxPrice) }),
  };
}

// The condition in words for the model: the ceiling and how many plans fit it, with that none does or that no plan has
// a price, and the cheapest first.
export function priceConditionWords(plans: readonly Plan[], { maxPrice, cheapFirst }: PriceCondition): object {
  const order = cheapFirst === true ? { cheapFirst: true } : {};
  if (maxPrice === undefined) {
    return order;
  }
  const prices = plans.map((plan) => planPrice(plan));
  if (prices.every((price) => price === null)) {
    return { ...order, maxPrice, pricesUnknown: true };
  }
  const fitting = prices.filter((price) => fitsUnder(price, maxPrice)).length;
  return { ...order, maxPrice, fitting, ...(fitting === 0 ? { noneUnder: true } : {}) };
}
