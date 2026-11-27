/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { CUISINE_WORD_LIST, type CuisineWord } from '../../menus/cuisine-words.js';
import { type AnswerReply, type MealInput, type ReplyStep, type RequestContext } from '../dto/answer.dto.js';
import { defineTool, type Presented, type Tool, type ToolContext } from '../feature.js';
import { afterEarlierSteps } from '../steps/plan-steps.js';
import { type FoundIds, type FoundKind } from '../found-ids.js';
import { mealByClock } from '../free-time/meal-fit.js';
import { clockTime, dateInput, outOfReach, outOfReachDay } from '../free-time/tool-parts.js';
import { askedBy } from '../refusals/friend-question.js';
import { mealAfter, nextMealOffer } from './meal-after-hours.js';
import { PRICE_INPUTS, priceConditionOf } from './meal-price.js';
import { type MealPlanService } from './meal-plan.service.js';
import { addingWords, busyWords, invitedWords, plannedWords } from './meal-tool-words.js';
import { NOT_POSTED } from './not-posted.js';
import { skipOf, skippedWords, skipParameters } from '../free-time/left-out-classes.js';

export { PLAN_RULES } from './plan-rules.js';

// A meal planned on the map, for an app that draws answers (ADR 0009): the server decides everything, the model passes
// the User's words as conditions and writes one sentence. Coordinates, ids of Places, course names, and rooms stay here.

// The most Friends of a plan, the asker making it eight people.
export const FRIENDS_MAX = 7;

const NONE_REASONS: Record<NonNullable<AnswerReply['noPlan']>['reason'], string> = {
  'no-menu': 'No Restaurant serves that meal that day: every menu collected for it is closed or holds only notes.',
  'no-shared-time': 'There is no free time everyone shares during that meal.',
  'no-fit': 'No Restaurant can be reached, eaten at, and left in time.',
};

const BREAKFAST = 'Breakfast is not planned: say in one sentence that lunch and dinner are.';

const NOT_NOW = 'There is no time now when everyone can eat together; the app offers buttons to ease it.';

const overToday = (words: string): string =>
  `That meal is over for today. The app shows your sentence with one button, which plans ${words}. Say in one sentence that the meal is over and that the button plans ${words}; name no other button.`;

// A Friend's name as the chips write it, without " · 출발지 모름" or " · 위치 모름".
const friendNames = ({ chips }: AnswerReply): string[] =>
  chips.flatMap(({ kind, text }) => (kind === 'person' ? [text.split(' · ')[0] ?? text] : []));

// No plan: a meal over for today leaves the map and offers the next meal instead, and the model hears of buttons only
// when the answer carries some.
function noneOf(
  answer: AnswerReply,
  input: MealInput,
  { now, presented, posted }: { now: Date; presented: Presented; posted: boolean },
): object {
  const relax = answer.noPlan?.relax ?? [];
  const next = relax.length === 0 ? mealAfter(input, now) : null;
  if (next !== null) {
    presented.answer = null;
    presented.clears = true;
    presented.offers = [nextMealOffer(next, friendNames(answer))];
    return { result: 'none', meal: input.meal, reason: overToday(next.words) };
  }
  const reason = answer.noPlan?.reason ?? 'no-fit';
  if (!posted) {
    return { result: 'none', meal: input.meal, reason: NOT_POSTED };
  }
  return { result: 'none', meal: input.meal, reason: relax.length > 0 ? NOT_NOW : NONE_REASONS[reason] };
}

const input = z
  .object({
    date: dateInput,
    meal: z
      .enum(['lunch', 'dinner', 'breakfast'])
      .optional()
      .describe(
        "lunch or dinner, only when the User's words name the meal (점심, 저녁); breakfast for 아침, which is not planned. Left out otherwise: the server takes the one being served or the next one today, and lunch on a later day.",
      ),
    friendIds: z
      .array(z.uuid())
      .max(FRIENDS_MAX)
      .default([])
      .describe(
        'The Friends, as resolveFriend or findFreeFriends returned them in this message, or as [Plan on screen: …] or [Tapped: friend …] gives them. None for the User alone.',
      ),
    from: clockTime
      .optional()
      .describe(
        "The start the User fixed, as HH:MM, even one before the meal's hours, which the server fits to them: nobody is there before it. Left out when they fixed none.",
      ),
    until: clockTime
      .optional()
      .describe('The end the User fixed, as HH:MM: everyone has left by it. Left out when they fixed none.'),
    now: z
      .boolean()
      .optional()
      .describe(
        'True when the User wants the meal now (지금, 바로), or when [Plan on screen: …] has now: the plan then starts soon or not at all. Left out otherwise.',
      ),
    restaurant: z
      .string()
      .min(1)
      .optional()
      .describe(
        'A Restaurant to eat at, by its name as planMeal answered it, when the User picks one by its food. The server plans at its Place. Left out otherwise.',
      ),
    placeId: z
      .uuid()
      .optional()
      .describe(
        'The Place to eat at, as resolvePlace returned it in this message, or as [Plan on screen: …] or [Tapped: place …] gives it. Left out for any.',
      ),
    cuisine: z
      .enum([...CUISINE_WORD_LIST, 'any'])
      .optional()
      .describe(
        "The kind of food the User named (한식, 중식, 일식, 양식, 분식): the plans of the Restaurants that serve it come first, and the app shows that kind. 'any' when they let it go (아무거나). Left out otherwise: the kind on screen is kept.",
      ),
    ...PRICE_INPUTS,
    startPlaceId: z
      .uuid()
      .optional()
      .describe(
        "The Place the User sets out from for the meal, only when they name it (220동에서 출발해서), as resolvePlace returned it in this message. Left out otherwise: the server takes the place of the step before the meal in this message, else the User's previous Class or location.",
      ),
    pickPeople: z
      .boolean()
      .optional()
      .describe(
        'True when the User wants company for the meal without naming everyone (친구랑, 친구 두 명이랑, 누구랑 같이): the app opens the list of their Friends on the plan to pick from. The Friends they do name go in friendIds as usual. Left out otherwise.',
      ),
    ...skipParameters,
  })
  .refine(({ from, until }) => from === undefined || until === undefined || from < until, 'Expected from before until');

type PlanMealArgs = z.infer<typeof input>;

// An id is accepted when a resolver returned it in this message, or when it is on screen or tapped. The asker heads
// the conditions on screen and is no Friend of them.
export function refuseUnseen(found: FoundIds, kind: FoundKind, ids: readonly string[], seen: readonly string[]): void {
  found.refuseUnfound(
    kind,
    ids.filter((id) => !seen.includes(id)),
  );
}

function seenIds({ conditions: shown, tapped }: RequestContext): { friends: string[]; places: string[] } {
  const conditions = shown?.kind === 'meal' ? shown : null;
  const placeOnScreen = conditions?.placeId ?? null;
  return {
    friends: [
      ...(conditions?.people.slice(1).map(({ userId }) => userId) ?? []),
      ...(tapped?.kind === 'friend' ? [tapped.userId] : []),
    ],
    places: [...(placeOnScreen === null ? [] : [placeOnScreen]), ...(tapped?.kind === 'place' ? [tapped.placeId] : [])],
  };
}

// Each person's constraints of the conditions on screen, kept while the Plan stays on the same day and meal: the model
// cannot give them, so a change in words would lose them.
function constraintsOf(
  { conditions }: RequestContext,
  date: string,
  meal: MealInput['meal'],
): Map<string, MealInput['people'][number]['constraints']> {
  if (conditions?.kind !== 'meal' || conditions.date !== date || conditions.meal !== meal) {
    return new Map();
  }
  return new Map(conditions.people.map(({ userId, constraints }) => [userId, constraints]));
}

// The kind of food the User named, none for 'any', else the one on screen for the same day and meal.
function kindOf(
  asked: CuisineWord | 'any' | undefined,
  { conditions }: RequestContext,
  date: string,
  meal: MealInput['meal'],
): CuisineWord | null {
  if (asked !== undefined) {
    return asked === 'any' ? null : asked;
  }
  return conditions?.kind === 'meal' && conditions.date === date && conditions.meal === meal
    ? (conditions.cuisine ?? null)
    : null;
}

// The asker's constraints with the start they named, in place of any start kept from the screen.
function withStart(
  kept: Map<string, MealInput['people'][number]['constraints']>,
  askerId: string,
  startPlaceId: string | undefined,
): Map<string, MealInput['people'][number]['constraints']> {
  if (startPlaceId === undefined) {
    return kept;
  }
  const others = (kept.get(askerId) ?? []).filter(({ kind }) => kind !== 'from');
  return new Map([...kept, [askerId, [...others, { kind: 'from', placeId: startPlaceId, source: 'asker' }]]]);
}

// The Place of the Restaurant the model named, refused when the seed places no Restaurant of that name; else the Place
// it gave.
function placeIdOf(
  plans: Pick<MealPlanService, 'restaurantPlaceId'>,
  restaurant?: string,
  placeId?: string,
): string | null {
  if (restaurant === undefined) {
    return placeId ?? null;
  }
  const placed = plans.restaurantPlaceId(restaurant);
  if (placed === null) {
    throw new Error(`No Restaurant is named ${restaurant}: give a restaurant as planMeal answered it`);
  }
  return placed;
}

// The meal planMeal plans, with what the conditions on screen keep: each person's constraints for the same day and
// meal, the kind of food, and the price (P05 ticket 53).
function mealInputOf(
  { date, friendIds, from, until, now: soon, restaurant, placeId, cuisine, startPlaceId, ...asked }: PlanMealArgs,
  meal: MealInput['meal'],
  { userId, context }: Pick<ToolContext, 'userId' | 'context'>,
  plans: Pick<MealPlanService, 'restaurantPlaceId'>,
): MealInput {
  const kept = withStart(constraintsOf(context, date, meal), userId, startPlaceId);
  const kind = kindOf(cuisine, context, date, meal);
  return {
    kind: 'meal',
    date,
    meal,
    people: [userId, ...new Set(friendIds)].map((id) => ({ userId: id, constraints: kept.get(id) ?? [] })),
    window: { from: from ?? null, until: until ?? null, ...(soon === true ? { now: true } : {}) },
    placeId: placeIdOf(plans, restaurant, placeId),
    ...(kind === null ? {} : { cuisine: kind }),
    ...priceConditionOf(asked, context),
  };
}

// Plans the input as planMeal answers it; nothing for a meal the User was only invited to (P05 ticket 44).
async function plannedFor(
  plans: Pick<MealPlanService, 'asked' | 'planned'>,
  chained: MealInput,
  { toolContext, planInput, kind }: { toolContext: ToolContext; planInput: MealInput; kind: CuisineWord | null },
): Promise<object> {
  const { userId, now, context, presented } = toolContext;
  const { location, locationMissing } = context;
  const at = { now, location, locationMissing, setsAside: toolContext.capabilities.has('plan-set') };
  const asked = await plans.asked(userId, chained);
  presented.lookup = null;
  presented.mapButtons.length = 0;
  if ('invited' in asked) {
    presented.answer = null;
    presented.clears = true;
    return invitedWords(asked.invited, planInput.meal);
  }
  const { answer, served, busy = [], posted = true } = await plans.planned(userId, asked.input, at);
  presented.answer = answer;
  const adding = addingWords(answer, asked.alreadyIn);
  if (answer.noPlan !== null) {
    return { ...noneOf(answer, planInput, { now, presented, posted }), ...busyWords(busy), ...adding };
  }
  return { ...plannedWords(answer, served, { meal: planInput.meal, kind }), ...adding };
}

// The planner planMeal asks; a test's may know no Classes.
type MealPlans = Pick<MealPlanService, 'asked' | 'planned' | 'restaurantPlaceId'> &
  Partial<Pick<MealPlanService, 'classesOn'>>;

// `earlier`: the steps shown before the meal in this message, which it sets out from (P03).
export function planMeal(plans: MealPlans, earlier: (context: ToolContext) => readonly ReplyStep[] = () => []): Tool {
  return defineTool({
    description:
      "Plans a meal for the User alone or with Friends on a day from today to a week ahead. The server decides the Restaurant, when everyone is there, how long they can eat, and where they meet on the way, those with 30 minutes for everyone first, each the least travel for everyone first, on foot or by the shuttle, (to the Restaurant and on to each one's next item), and the app draws the plans on the map. Answers result 'planned' with the meal and the plans in order, each with its restaurant, its menu for the meal and closesAt, its price as the app's list writes it, start, end, togetherMinutes, meeting, and each person's way, and the Restaurants dropped, or result 'none' with the meal and the reason.",
    input,
    run: async (args, toolContext) => {
      const { date, friendIds, placeId, startPlaceId, pickPeople } = args;
      const { userId, now, context, found, presented } = toolContext;
      // A plan asked for a day out of reach, or for breakfast, cannot be made: the plan on screen leaves the map, so that
      // the reply's words are not read over it (P05 ticket 55).
      if (outOfReach(date, now)) {
        return outOfReachDay(date, presented);
      }
      if (args.meal === 'breakfast') {
        presented.clears = true;
        return { result: 'none', meal: 'breakfast', reason: BREAKFAST };
      }
      const seen = seenIds(context);
      askedBy('planMeal', friendIds, found, presented);
      refuseUnseen(found, 'friend', friendIds, seen.friends);
      refuseUnseen(found, 'place', placeId === undefined ? [] : [placeId], seen.places);
      refuseUnseen(found, 'place', startPlaceId === undefined ? [] : [startPlaceId], []);
      const skip = await skipOf(plans.classesOn, { userId, date, context, presented }, args);
      if ('result' in skip) {
        return skip;
      }
      const meal = args.meal ?? mealByClock(date, now, args.from);
      const planInput: MealInput = {
        ...mealInputOf(args, meal, toolContext, plans),
        ...(skip.ids.length === 0 ? {} : { skipped: skip.ids }),
      };
      const kind = planInput.cuisine ?? null;
      const words = await plannedFor(plans, afterEarlierSteps(planInput, earlier(toolContext)), {
        toolContext,
        planInput,
        kind,
      });
      if (pickPeople === true) {
        presented.answer = withPicking(presented.answer);
      }
      const shown = presented.answer?.input;
      return { ...words, ...skippedWords(shown?.kind === 'meal' ? (shown.skipped ?? []) : [], skip.classes) };
    },
  });
}

// A meal asked with company the User did not name (P04 ticket 73) opens the picking of Friends on the plan, when it has
// a plan and someone left to pick: a User without Friends gets the plan alone.
function withPicking(answer: AnswerReply | null): AnswerReply | null {
  const others = answer?.plans[0]?.band.others ?? [];
  return answer === null || others.length === 0 ? answer : { ...answer, pickPeople: true };
}
