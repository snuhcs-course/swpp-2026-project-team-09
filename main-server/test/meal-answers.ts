/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerReply,
  type PersonConstraint,
  type PlacePoint,
  type PlanInput,
} from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { type AnswerPerson, mealAnswer, type MealAnswerArgs } from '../src/assistant/gathering/meal-answer.js';
import { conditionsOf, windowOf } from '../src/assistant/gathering/plan-conditions.js';
import { type Position } from '../src/common/geometry.js';
import {
  DATE,
  id,
  jieunDay,
  gatheringPerson,
  minsuDay,
  myDay,
  NOW,
  plan,
  placeOf,
  restaurants,
} from './worked-example.js';

// The people of the worked example as the wording takes them, and an answer for them. Call `readWorld` in a beforeAll
// first.

export const ME = 'b0c2e3a4-0000-4000-8000-000000000001';
export const MINSU = 'b0c2e3a4-0000-4000-8000-000000000002';
export const JIEUN = 'b0c2e3a4-0000-4000-8000-000000000003';
export const HAEUN = 'b0c2e3a4-0000-4000-8000-000000000004';

export const person = (userId: string, name: string, items: DayItem[]): AnswerPerson => ({
  userId,
  name,
  me: userId === ME,
  items,
  position: null,
});

export const me = (): AnswerPerson => person(ME, '유상', myDay());
export const minsu = (): AnswerPerson => person(MINSU, '민수', minsuDay());
export const jieun = (): AnswerPerson => person(JIEUN, '지은', jieunDay());
// Free all day, with no position the asker may see.
export const haeun = (): AnswerPerson => person(HAEUN, '하은', []);

// What the User fixed: the window, the Place, and each person's constraints by their id.
export interface Fixed {
  window?: PlanInput['window'];
  placeId?: string | null;
  constraints?: Record<string, PersonConstraint[]>;
}

const inputOf = (people: readonly AnswerPerson[], fixed: Fixed): PlanInput => ({
  kind: 'meal',
  date: DATE,
  meal: 'lunch',
  people: people.map(({ userId }) => ({ userId, constraints: fixed.constraints?.[userId] ?? [] })),
  window: fixed.window ?? { from: null, until: null },
  placeId: fixed.placeId ?? null,
});

interface AnswerOptions {
  aloneMinutes?: number | null;
  menus?: MealAnswerArgs['menus'];
  candidates?: GatheringPlace[];
  now?: Date;
  fixed?: Fixed;
}

export function answerOf(
  people: [AnswerPerson, ...AnswerPerson[]],
  { aloneMinutes = null, menus = 'open', candidates = restaurants(), now = NOW, fixed = {} }: AnswerOptions = {},
): AnswerReply {
  const input = inputOf(people, fixed);
  const [first, ...rest] = people.map(({ userId, items }, index) => ({
    ...gatheringPerson(userId, items, null, now),
    ...conditionsOf(input.people[index]?.constraints ?? [], DATE),
  }));
  if (first === undefined) {
    throw new Error('No asker');
  }
  return mealAnswer({
    input,
    now,
    people,
    gathering: plan([first, ...rest], candidates, now, windowOf(input)),
    aloneMinutes,
    menus,
    placeOf,
  });
}

export const time = (clock: string): string => `${DATE}T${clock}:00+09:00`;

export const position = (name: string): Position => {
  const { latitude, longitude } = placeOf(id(name));
  return { latitude, longitude };
};

export const point = (name: string, label: string): PlacePoint => ({ placeId: id(name), label, ...position(name) });

export const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
export const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

export function firstPlan(answer: AnswerReply): AnswerReply['plans'][number] {
  const [first] = answer.plans;
  if (first === undefined) {
    throw new Error('No plan');
  }
  return first;
}

// The answer for the asker, 민수, and 지은, the asker's meal alone being 55 minutes.
export const withBoth = (): AnswerReply => answerOf([me(), minsu(), jieun()], { aloneMinutes: 55 });
