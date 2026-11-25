/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, Cuisine, MealInput, Plan } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import { MEAL_ANSWER } from './meal-answer';

// The answer of `meal-answer.ts` with each Plan's menu, as a main server since P05's `Plan.menu` sends it: the main
// corner's dishes in the menu's order, their first and their count as each Plan's line says ("뼈없는감자탕 외 5"), and
// 자하연식당 2층's buffet price, each dish with its kind of food, and dinner as the day's other meal. The prices and the
// kinds are examples. Its dinner is the same answer five hours later with the evening's dishes.

type Menu = NonNullable<Plan['menu']>;

type Dish = [string, number | null, Cuisine | null];

function dishes(...rows: Dish[]): Menu['dishes'] {
  return rows.map(([name, price, cuisine]) => ({ name, price, cuisine }));
}

const MENUS: Readonly<Record<string, Menu>> = {
  '302동식당': {
    price: null,
    dishes: dishes(
      ['뼈없는감자탕', 6000, '한식'],
      ['돈까스', 5500, '양식'],
      ['제육덮밥', 5000, '한식'],
      ['김치볶음밥', 4500, '한식'],
      ['잔치국수', 4000, '한식'],
      ['그린샐러드', 5500, null],
    ),
  },
  '301동식당': {
    price: null,
    dishes: dishes(
      ['부대짬뽕&군만두', 6500, '중식'],
      ['뚝배기불고기', 6000, '한식'],
      ['김치찌개', 5000, '한식'],
      ['야채비빔밥', 5000, '한식'],
      ['오므라이스', null, '양식'],
    ),
  },
  학생회관식당: {
    price: null,
    dishes: dishes(['눈꽃치즈닭갈비', 5500, '한식'], ['단호박영양밥', 4500, '한식'], ['천원의 식사', 1000, null]),
  },
  '3식당': {
    price: null,
    dishes: dishes(['치즈한장부대찌개', 6000, '한식'], ['돈까스카레', 6500, '일식'], ['잔치국수', 4000, '한식']),
  },
  '자하연식당 2층': { price: 6500, dishes: dishes(['나가사키꼬치어묵', null, '일식'], ['오코노미야키', null, '일식']) },
};

const DINNERS: Readonly<Record<string, Menu>> = {
  '302동식당': { price: null, dishes: dishes(['대파육개장', 6000, '한식'], ['함박스테이크', 6500, '양식']) },
  '301동식당': { price: null, dishes: dishes(['짜장면', 5000, '중식'], ['탕수육덮밥', 6000, '중식']) },
  학생회관식당: { price: null, dishes: dishes(['떡볶이&튀김', 4500, '분식']) },
  '3식당': { price: null, dishes: dishes(['순두부찌개', 5500, '한식']) },
  '자하연식당 2층': { price: null, dishes: dishes(['목살필라프', 7000, '양식']) },
};

function withMenu(menus: Readonly<Record<string, Menu>>): (plan: Plan) => Plan {
  return (plan) => {
    const menu = menus[plan.place.label];
    return menu === undefined ? plan : { ...plan, menu };
  };
}

export const MEAL_ANSWER_MENUS: AnswerReply & { input: MealInput } = {
  ...MEAL_ANSWER,
  plans: MEAL_ANSWER.plans.map(withMenu(MENUS)),
};

// Every time of the answer five hours later, lunch's words as dinner's.
function fiveHoursLater(value: AnswerReply): AnswerReply {
  const later = JSON.stringify(value)
    .replaceAll(/T(\d{2}):/gu, (_, hour: string) => `T${String(Number(hour) + 5).padStart(2, '0')}:`)
    .replaceAll(
      /(?<![T:+\d])(\d{2}):(\d{2})(?![:\d])/gu,
      (_, hour: string, minute: string) => `${String(Number(hour) + 5)}:${minute}`,
    )
    .replaceAll('점심', '저녁');
  const copy: unknown = JSON.parse(later);
  if (!isAnswerReply(copy)) {
    throw new Error('The dinner copy fails the check of a reply');
  }
  return copy;
}

export const MEAL_DINNER_MENUS: AnswerReply & { input: MealInput } = {
  ...fiveHoursLater({ ...MEAL_ANSWER, plans: MEAL_ANSWER.plans.map(withMenu(DINNERS)) }),
  input: { ...MEAL_ANSWER.input, meal: 'dinner' },
};

export const MEAL_ANSWER_MENUS_REPLY: AssistantReply & { answer: AnswerReply } = {
  text: '12:15에 302동식당에서 민수와 만나 먹어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: MEAL_ANSWER_MENUS,
};
