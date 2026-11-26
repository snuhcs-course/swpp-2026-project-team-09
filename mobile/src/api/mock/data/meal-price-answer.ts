/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MealInput, Plan, PlanInput } from '@/api/assistant-types';
import { won } from '@/features/dining/adapter';
import { cheapestDish } from '@/features/assistant/meal-price';
import { MEAL_ANSWER_MENUS, MEAL_DINNER_MENUS } from './meal-answer-menus';

// A meal with a price condition without a main server (P04 ticket 92): the stored lunch or dinner in the main server's
// order of P05 ticket 53, the places under the ceiling first, the others after them, every place cheapest first when
// none is under it, and by price with the cheapest first.

type PriceCondition = Pick<MealInput, 'maxPrice' | 'cheapFirst'>;

const priceOf = (plan: Plan): number | null =>
  plan.menu === undefined ? null : (cheapestDish(plan.menu)?.price ?? null);

const cheapestFirst = (plans: readonly Plan[]): Plan[] =>
  plans.toSorted((one, other) => (priceOf(one) ?? Infinity) - (priceOf(other) ?? Infinity));

const fits = (plan: Plan, maxPrice: number): boolean => (priceOf(plan) ?? Infinity) <= maxPrice;

function ordered(plans: readonly Plan[], { maxPrice, cheapFirst }: PriceCondition): Plan[] {
  if (plans.every((plan) => priceOf(plan) === null)) {
    return [...plans];
  }
  if (maxPrice === undefined) {
    return cheapFirst === true ? cheapestFirst(plans) : [...plans];
  }
  const fitting = plans.filter((plan) => fits(plan, maxPrice));
  if (fitting.length === 0) {
    return cheapestFirst(plans);
  }
  const over = plans.filter((plan) => !fits(plan, maxPrice));
  return [...(cheapFirst === true ? cheapestFirst(fitting) : fitting), ...over];
}

// The answer with the condition in its input and its plans in the main server's order.
export function pricedAnswer(
  answer: AnswerReply & { input: MealInput },
  condition: PriceCondition,
): AnswerReply & { input: MealInput } {
  const input: MealInput = { ...answer.input, ...condition };
  return { ...answer, input, plans: ordered(answer.plans, condition) };
}

// A recalculation of the conditions with a price: the stored copy in that order; any other as it is.
export function pricedCopy(copy: AnswerReply, input: PlanInput): AnswerReply {
  return input.kind === 'meal' ? { ...copy, plans: ordered(copy.plans, input) } : copy;
}

// The price condition in the User's words: "5천원 이하" or "6천원 정도" for that many thousands, "만원 안쪽" for 10,000,
// and "싼" for the cheapest first; null for none.
export function priceAskedOf(words: string): PriceCondition | null {
  const thousands = /(\d+)\s*천\s*원?\s*(?:이하|까지|안쪽|정도)/u.exec(words);
  const tenThousand = /만\s*원?\s*(?:이하|까지|안쪽|정도)/u.test(words);
  const maxPrice = thousands === null ? (tenThousand ? 10_000 : null) : Number(thousands[1]) * 1000;
  const cheap = words.includes('싼');
  if (maxPrice === null && !cheap) {
    return null;
  }
  return { ...(maxPrice === null ? {} : { maxPrice }), ...(cheap ? { cheapFirst: true } : {}) };
}

// The reply to a meal asked by price, its one sentence as the main server's rules write it.
export function priceReplyOf(words: string): AssistantReply | null {
  const condition = priceAskedOf(words);
  if (condition === null) {
    return null;
  }
  const answer = pricedAnswer(words.includes('점심') ? MEAL_ANSWER_MENUS : MEAL_DINNER_MENUS, condition);
  const [first] = answer.plans;
  const price = first === undefined ? null : priceOf(first);
  const { maxPrice } = condition;
  let text = `가장 싼 ${first?.id ?? ''}을 추천해요.`;
  if (maxPrice !== undefined && price !== null && price <= maxPrice) {
    text = `${won(maxPrice)} 이하로는 가장 덜 걷는 ${first?.id ?? ''}을 추천해요.`;
  } else if (maxPrice !== undefined) {
    text = `${won(maxPrice)} 이하는 없어서, 가장 싼 ${first?.id ?? ''}을 추천해요.`;
  }
  return { text, mapButtons: [], cards: [], proposal: null, answer };
}
