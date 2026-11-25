/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, Plan } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { MEAL_ANSWER_MENUS } from './meal-answer-menus';
import { MEAL_ANSWER_ALONE } from './meal-answers';

// A menu question's answers as the main server gives them since P04 ticket 72.
// - "오늘 301동식당 메뉴 뭐야?": the meal answer for the User alone at 301동's Place, opened at 301동식당. Its Plan is the
//   stored answer's for the User alone (`meal-answer-alone.json`) with 301동식당's menu (`meal-answer-menus.ts`), and the
//   model writes nothing.
// - "학생회관식당 메뉴 뭐야?" of 3 October, a holiday whose lunch its menu closes ("개천절 휴무", `menus.ts`): no Plan,
//   and the Restaurant on the map with its menu and why.

function planOf(answer: AnswerReply, id: string): Plan {
  const plan = answer.plans.find((one) => one.id === id);
  if (plan === undefined) {
    throw new Error(`The stored answer has no Plan at ${id}`);
  }
  return plan;
}

const ALONE = planOf(MEAL_ANSWER_ALONE, '301동식당');
const { menu } = planOf(MEAL_ANSWER_MENUS, '301동식당');

// The Plan at 301동's Place alone: no other Restaurant is a candidate there.
const PLAN: Plan = {
  ...ALONE,
  ...(menu === undefined ? {} : { menu }),
  scene: {
    ...ALONE.scene,
    places: ALONE.scene.places.filter(({ role }) => role !== 'candidate' && role !== 'dropped'),
  },
};

export const MENU_ANSWER: AnswerReply = {
  ...MEAL_ANSWER_ALONE,
  input:
    MEAL_ANSWER_ALONE.input.kind === 'meal'
      ? { ...MEAL_ANSWER_ALONE.input, placeId: PLAN.place.placeId }
      : MEAL_ANSWER_ALONE.input,
  plans: [PLAN],
  dropped: [],
  opened: PLAN.id,
};

// The main server's sentence when the model writes none beside an answer (`wordless-reply.ts`).
export const MENU_ANSWER_REPLY: AssistantReply & { answer: AnswerReply } = {
  text: '아래에서 확인해 보세요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: MENU_ANSWER,
  lookup: null,
};

// 학생회관's Place of the mocks (`places.ts`).
const STUDENT_CENTRE = { placeId: 'place-63', label: '학생회관식당' };
const STUDENT_CENTRE_AT = { latitude: 37.45932, longitude: 126.95058 };

export const MENU_CLOSED_LOOKUP: Lookup = {
  kind: 'place',
  chips: [],
  lines: [],
  basis: [],
  scene: {
    people: [],
    places: [{ place: { ...STUDENT_CENTRE, ...STUDENT_CENTRE_AT }, role: 'pick', tag: STUDENT_CENTRE.label }],
    routes: [],
    flags: [{ at: STUDENT_CENTRE_AT, text: '학생회관식당 · 10/3(토) 점심은 안 해요', role: 'place' }],
  },
  band: null,
  actions: [{ kind: 'guide', to: { ...STUDENT_CENTRE, ...STUDENT_CENTRE_AT } }],
  fact: true,
  menuView: { restaurant: '학생회관식당', date: '2026-10-03', meal: 'lunch', why: '10/3(토) 휴점' },
};

export const MENU_CLOSED_REPLY: AssistantReply & { lookup: Lookup } = {
  text: '학생회관식당은 10/3(토) 점심에 휴점이에요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: MENU_CLOSED_LOOKUP,
};
