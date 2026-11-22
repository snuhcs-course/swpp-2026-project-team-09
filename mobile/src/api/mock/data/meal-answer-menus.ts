/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MealInput, Plan } from '@/api/assistant-types';
import { MEAL_ANSWER } from './meal-answer';

// The answer of `meal-answer.ts` with each Plan's menu, as a main server since P05's `Plan.menu` sends it: the main
// corner's dishes in the menu's order, their first and their count as each Plan's line says ("뼈없는감자탕 외 5"), and
// 자하연식당 2층's buffet price. The prices are examples.

type Menu = NonNullable<Plan['menu']>;

function dishes(...pairs: [string, number | null][]): Menu['dishes'] {
  return pairs.map(([name, price]) => ({ name, price }));
}

const MENUS: Readonly<Record<string, Menu>> = {
  '302동식당': {
    price: null,
    dishes: dishes(
      ['뼈없는감자탕', 6000],
      ['돈까스', 5500],
      ['제육덮밥', 5000],
      ['김치볶음밥', 4500],
      ['잔치국수', 4000],
      ['그린샐러드', 5500],
    ),
  },
  '301동식당': {
    price: null,
    dishes: dishes(
      ['부대짬뽕&군만두', 6500],
      ['뚝배기불고기', 6000],
      ['김치찌개', 5000],
      ['야채비빔밥', 5000],
      ['오므라이스', null],
    ),
  },
  학생회관식당: {
    price: null,
    dishes: dishes(['눈꽃치즈닭갈비', 5500], ['단호박영양밥', 4500], ['천원의 식사', 1000]),
  },
  '3식당': { price: null, dishes: dishes(['치즈한장부대찌개', 6000], ['돈까스카레', 6500], ['잔치국수', 4000]) },
  '자하연식당 2층': { price: 6500, dishes: dishes(['나가사키꼬치어묵', null], ['닭볶음탕', null]) },
};

function withMenu(plan: Plan): Plan {
  const menu = MENUS[plan.place.label];
  return menu === undefined ? plan : { ...plan, menu };
}

export const MEAL_ANSWER_MENUS: AnswerReply & { input: MealInput } = {
  ...MEAL_ANSWER,
  plans: MEAL_ANSWER.plans.map(withMenu),
};

export const MEAL_ANSWER_MENUS_REPLY: AssistantReply & { answer: AnswerReply } = {
  text: '12:15에 302동식당에서 민수와 만나 먹어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: MEAL_ANSWER_MENUS,
};
