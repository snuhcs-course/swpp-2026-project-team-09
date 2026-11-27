/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, type Tool } from '../feature.js';

// A plan of the meal answer on screen chosen in words (P05 ticket 51): "2번으로 할게" was planned again at that one
// Restaurant, a new answer numbered 1 (the user's phone, 2026-11-26). The app keeps the answer, its list and its
// numbers, and shows the plan chosen.

const PLANS_MAX = 30;
const NAME_MAX = 100;

// "학생회관 식당" and "학생회관식당" alike.
const bare = (name: string): string => name.replaceAll(/\s+/gu, '').toLowerCase();

// The listed plans the words name: the one named exactly, else every one whose name holds the words or is held by them
// ("두레미담" for 두레미담, "아워홈" for 아워홈(901동), "학생회관" for 학생회관식당).
function named(listed: readonly string[], words: string): string[] {
  const asked = bare(words);
  const exact = listed.filter((id) => bare(id) === asked);
  return exact.length > 0 ? exact : listed.filter((id) => bare(id).includes(asked) || asked.includes(bare(id)));
}

const NOT_ON_SCREEN =
  'No meal answer with numbered places is on screen: plan the meal with planMeal, with the Restaurant as a change of place.';

export const CHOOSE_PLAN_RULES = `- A line [Plan on screen: …] of a meal with numbered gives the places the app lists, numbered from 1 in that order, and plan the one shown. When the User chooses one of them by its number or its name, or the one shown (2번으로 할게, 3번, 두레미담으로, 거기로 하자, 이걸로 할게), call choosePlan with number, or with restaurant as the list names it, and call no planMeal: the app keeps the answer, its list and its numbers, and shows the one chosen. Your reply is one sentence that it is chosen, such as "2번 예술계식당으로 골랐어요.": nothing about its hours, menu or way, which the app shows. choosePlan may follow a planMeal of the same message, such as for a dish picked from the plans' menus, or a Friend added with the choice ("2번으로 하고 지은이도 불러 줘"): give the number the User said, which counts on the list on screen, or the restaurant among the new answer's plans, and the app opens that new answer at the plan chosen. When choosePlan answers none, ask in one short sentence which number, such as "1번부터 6번까지 있어요. 몇 번으로 할까요?". When it answers several, ask which of them by name. When it answers notListed, the place is not among them: it is a change of place, by the rule of changing the plan on screen.`;

export function choosePlan(): Tool {
  return defineTool({
    description:
      'Chooses a plan of the meal answer on screen by its number in the list or its Restaurant, keeping the answer, its list and its numbers. Answers result chosen with the number and the restaurant; none, with how many are listed, for a number not listed or no list on screen; several with the restaurants the words could name; or notListed.',
    input: z
      .object({
        number: z.int().min(1).max(PLANS_MAX).optional().describe('The number the User said (2번 → 2).'),
        restaurant: z
          .string()
          .min(1)
          .max(NAME_MAX)
          .optional()
          .describe('The Restaurant the User named, or the plan shown, as [Plan on screen: …] names it.'),
      })
      .refine(({ number, restaurant }) => (number === undefined) !== (restaurant === undefined), {
        message: 'Give number or restaurant',
      }),
    run: ({ number, restaurant }, { context, presented }) => {
      const { conditions, planIds } = context;
      // A meal's answer, or a study answer's (P10 ticket 05), lists its places numbered.
      const listed = conditions?.kind === 'meal' || conditions?.kind === 'study' ? (planIds ?? []) : [];
      // The plans a planMeal of this message drew, which the app opens at the plan chosen: a dish picked from their
      // menus, or a choice asked with a change ("2번으로 하고 지은이도 불러 줘").
      const kind = presented.answer?.input.kind;
      const drawn = kind === 'meal' || kind === 'study' ? (presented.answer?.plans.map(({ id }) => id) ?? null) : null;
      if (listed.length === 0 && drawn === null) {
        return Promise.resolve({ result: 'none', listed: 0, reason: NOT_ON_SCREEN });
      }
      if (number !== undefined && listed[number - 1] === undefined) {
        return Promise.resolve({ result: 'none', listed: listed.length });
      }
      const ids = number === undefined ? named(drawn ?? listed, restaurant ?? '') : [listed[number - 1] ?? ''];
      const [id, ...others] = ids;
      if (id === undefined || (drawn !== null && !drawn.includes(id))) {
        return Promise.resolve({ result: 'notListed' });
      }
      if (others.length > 0) {
        return Promise.resolve({ result: 'several', restaurants: ids });
      }
      presented.select = id;
      return Promise.resolve({ result: 'chosen', number: (drawn ?? listed).indexOf(id) + 1, restaurant: id });
    },
  });
}
