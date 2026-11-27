/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MealInput, Plan, PlanInput } from '@/api/assistant-types';
import type { PlanMenu } from '@/features/assistant/meal-menus';
import { won } from '@/features/dining/adapter';

// A meal's price condition on the list and the map (P04 ticket 92, the design page "밥 조건 두 가지" § 2): the main
// server puts the places whose list price is at or under the ceiling first, the others after them, or every place
// cheapest first (P05 ticket 53); the app shows the condition as chips, the fitting dish in each row, and the places
// over the ceiling apart, unnumbered on the list and on the map.

export type Condition = 'maxPrice' | 'cheapFirst';

const CHEAP_FIRST = '싼 순';

// The dish the list's price speaks of, with that price, as the main server's `cheapestDish`: the corner's first dish
// at the corner's own price, else the first of its cheapest dishes; none when nothing has a price.
export function cheapestDish({ price, dishes }: PlanMenu): { name: string; price: number } | null {
  const [first] = dishes;
  if (price !== null) {
    return first === undefined ? null : { name: first.name, price };
  }
  return dishes.reduce<{ name: string; price: number } | null>(
    (cheapest, { name, price: own }) =>
      own !== null && (cheapest === null || own < cheapest.price) ? { name, price: own } : cheapest,
    null,
  );
}

function mealInputOf(answer: AnswerReply | null): MealInput | null {
  return answer?.input.kind === 'meal' ? answer.input : null;
}

function fits(plan: Plan, maxPrice: number): boolean {
  const price = plan.menu === undefined ? null : (cheapestDish(plan.menu)?.price ?? null);
  return price !== null && price <= maxPrice;
}

// The ceiling the plans are under, when some are: none without a ceiling or when none fits it.
function fittingCeiling(answer: AnswerReply | null): number | null {
  const maxPrice = mealInputOf(answer)?.maxPrice;
  return maxPrice === undefined || !(answer?.plans.some((plan) => fits(plan, maxPrice)) ?? false) ? null : maxPrice;
}

// The plans over the ceiling, set apart, when some others are under it.
export function overPriceIds(answer: AnswerReply | null): ReadonlySet<string> {
  const maxPrice = fittingCeiling(answer);
  return new Set(
    maxPrice === null || answer === null
      ? []
      : answer.plans.filter((plan) => !fits(plan, maxPrice)).map(({ id }) => id),
  );
}

// The plans the list numbers and the map draws: all but those over the ceiling.
export function fittingPlans(answer: AnswerReply): Plan[] {
  const over = overPriceIds(answer);
  return answer.plans.filter(({ id }) => !over.has(id));
}

// The plans over the ceiling with the ceiling, for the list's grey section; null when none is set apart.
export function overPriceOf(answer: AnswerReply): { maxPrice: number; plans: Plan[] } | null {
  const maxPrice = fittingCeiling(answer);
  const over = overPriceIds(answer);
  return maxPrice === null ? null : { maxPrice, plans: answer.plans.filter(({ id }) => over.has(id)) };
}

// Whether the main server ordered the plans by price, which the list keeps: the cheapest first, or a ceiling none fits.
export function pricedOrder(answer: AnswerReply): boolean {
  const input = mealInputOf(answer);
  return input?.cheapFirst === true || (input?.maxPrice !== undefined && fittingCeiling(answer) === null);
}

export const PRICED_ORDER_WORDS = CHEAP_FIRST;

// A fitting plan's dish and its price, in place of its dishes in the list ("시나몬치킨스테이크 4,500원"); null when it
// has none or no ceiling sets it apart.
export function fitDishWords(plan: Plan): string | null {
  const cheapest = plan.menu === undefined ? null : cheapestDish(plan.menu);
  return cheapest === null ? null : `${cheapest.name} ${won(cheapest.price)}`;
}

// Whether a row shows its fitting dish: with a ceiling some plans fit.
export function showsFitDish(answer: AnswerReply): boolean {
  return fittingCeiling(answer) !== null;
}

// The chips of the conditions the User set in words, the ceiling first.
export function conditionChipsOf(answer: AnswerReply | null): { condition: Condition; words: string }[] {
  const input = mealInputOf(answer);
  return [
    ...(input?.maxPrice === undefined
      ? []
      : [{ condition: 'maxPrice' as const, words: `${won(input.maxPrice)} 이하` }]),
    ...(input?.cheapFirst === true ? [{ condition: 'cheapFirst' as const, words: CHEAP_FIRST }] : []),
  ];
}

export function overHeading(maxPrice: number): string {
  return `${won(maxPrice)} 넘는 곳`;
}

// The conditions without one of them, which a chip's ✕ recalculates.
export function withoutCondition(input: PlanInput, condition: Condition): PlanInput {
  if (input.kind !== 'meal') {
    return input;
  }
  const { [condition]: _taken, ...rest } = input;
  return rest;
}
