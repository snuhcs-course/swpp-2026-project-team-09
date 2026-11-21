/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { CUISINE_WORD_LIST, type CuisineWord } from '../../menus/cuisine-words.js';
import { type AnswerReply, type MealInput, type Plan, type ReplyStep, type RequestContext } from '../dto/answer.dto.js';
import { defineTool, type Presented, type Tool, type ToolContext } from '../feature.js';
import { afterEarlierSteps } from '../steps/plan-steps.js';
import { type FoundIds, type FoundKind } from '../found-ids.js';
import { othersText } from '../others-text.js';
import { mealByClock } from '../free-time/meal-fit.js';
import { clockTime, dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { askedBy } from '../refusals/friend-question.js';
import { WHICH_FRIEND } from '../tools/which-friend.js';
import { mealAfter, nextMealOffer } from './meal-after-hours.js';
import { menuWords, type ServedMenu } from './meal-menu.js';
import { type MealPlanService } from './meal-plan.service.js';
import { alreadySetWords, busyWords, relatedWords, servingKind } from './meal-tool-words.js';

// A meal planned on the map, for an app that draws answers (ADR 0009): the server decides everything, the model passes
// the User's words as conditions and writes one sentence. Coordinates, ids of Places, course names, and rooms stay here.

// The most Friends of a plan, the asker making it eight people.
export const FRIENDS_MAX = 7;

const NONE_REASONS: Record<NonNullable<AnswerReply['noPlan']>['reason'], string> = {
  'no-menu': 'No Restaurant is open for that meal that day, or no menu was collected for it.',
  'no-shared-time': 'There is no free time everyone shares during that meal.',
  'no-fit': 'No Restaurant can be reached, eaten at, and left in time.',
};

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
  { now, presented }: { now: Date; presented: Presented },
): object {
  const relax = answer.noPlan?.relax ?? [];
  const next = relax.length === 0 ? mealAfter(input, now) : null;
  if (next !== null) {
    presented.answer = null;
    presented.offers = [nextMealOffer(next, friendNames(answer))];
    return { result: 'none', meal: input.meal, reason: overToday(next.words) };
  }
  const reason = answer.noPlan?.reason ?? 'no-fit';
  return { result: 'none', meal: input.meal, reason: relax.length > 0 ? NOT_NOW : NONE_REASONS[reason] };
}

const clock = (time: string | null): string | null => (time === null ? null : time.slice(11, 16));

const nameOf = ({ me, name }: Plan['parts'][number]): string => (me ? '나' : othersText('friend.name', name));

// The Restaurant's menu for the meal in words and when it closes, so that a User who picks by food is answered from
// the plans.
function planWords(plan: Plan, served: ReadonlyMap<string, ServedMenu>): object {
  const menu = served.get(plan.id);
  const words = menu === undefined ? {} : { menu: menuWords(menu.lines), closesAt: menu.closesAt };
  return { restaurant: plan.id, ...words, ...timesAndWays(plan) };
}

// When everyone is there and until when, where they meet on the way, and each person's way, in words and minutes.
export function timesAndWays(plan: Plan): object {
  const { startAt, endAt, togetherMinutes, meeting, parts } = plan;
  return {
    start: clock(startAt),
    end: clock(endAt),
    togetherMinutes,
    meeting:
      meeting === null
        ? null
        : {
            at: clock(meeting.at),
            place: meeting.place.label,
            with: parts.filter(({ me, userId }) => !me && meeting.userIds.includes(userId)).map((part) => nameOf(part)),
          },
    people: parts.map((part) => ({
      name: nameOf(part),
      from: part.origin?.place.label ?? null,
      walkMinutes: part.walkMinutes,
      leaveAt: clock(part.leaveAt),
      leaveBy: clock(part.leaveBy),
    })),
  };
}

const input = z
  .object({
    date: dateInput,
    meal: z
      .enum(['lunch', 'dinner'])
      .optional()
      .describe(
        "lunch or dinner, only when the User's words name the meal (점심, 저녁). Left out otherwise: the server takes the one being served or the next one today, and lunch on a later day.",
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
    startPlaceId: z
      .uuid()
      .optional()
      .describe(
        "The Place the User sets out from for the meal, only when they name it (220동에서 출발해서), as resolvePlace returned it in this message. Left out otherwise: the server takes the place of the step before the meal in this message, else the User's previous Class or location.",
      ),
  })
  .refine(({ from, until }) => from === undefined || until === undefined || from < until, 'Expected from before until');

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

// The plans in words for the model, and with a kind of food, the Restaurants that serve it.
function plannedWords(
  answer: AnswerReply,
  served: ReadonlyMap<string, ServedMenu>,
  { meal, kind }: { meal: MealInput['meal']; kind: CuisineWord | null },
): object {
  return {
    result: 'planned',
    meal,
    plans: answer.plans.map((plan) => planWords(plan, served)),
    dropped: answer.dropped.map(({ place }) => place.label),
    ...(kind === null ? {} : { cuisine: kind, servedBy: servingKind(answer.plans, kind) }),
    ...alreadySetWords(answer.mealSet),
    ...relatedWords(answer.related),
  };
}

// `earlier`: the steps shown before the meal in this message, which it sets out from (P03).
export function planMeal(
  plans: Pick<MealPlanService, 'planned' | 'restaurantPlaceId'>,
  earlier: (context: ToolContext) => readonly ReplyStep[] = () => [],
): Tool {
  return defineTool({
    description:
      "Plans a meal for the User alone or with Friends on a day from today to a week ahead. The server decides the Restaurant, when everyone is there, how long they can eat, and where they meet on the way, the longest time together first, and the app draws the plans on the map. Answers result 'planned' with the meal and the plans in order, each with its restaurant, its menu for the meal and closesAt, start, end, togetherMinutes, meeting, and each person's way, and the Restaurants dropped, or result 'none' with the meal and the reason.",
    input,
    run: async (
      { date, meal: named, friendIds, from, until, now: soon, restaurant, placeId, cuisine, startPlaceId },
      toolContext,
    ) => {
      const { userId, now, context, found, presented } = toolContext;
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const meal = named ?? mealByClock(date, now, from);
      const seen = seenIds(context);
      askedBy('planMeal', friendIds, found, presented);
      refuseUnseen(found, 'friend', friendIds, seen.friends);
      refuseUnseen(found, 'place', placeId === undefined ? [] : [placeId], seen.places);
      refuseUnseen(found, 'place', startPlaceId === undefined ? [] : [startPlaceId], []);
      const kept = withStart(constraintsOf(context, date, meal), userId, startPlaceId);
      const kind = kindOf(cuisine, context, date, meal);
      const planInput: MealInput = {
        kind: 'meal',
        date,
        meal,
        people: [userId, ...new Set(friendIds)].map((id) => ({ userId: id, constraints: kept.get(id) ?? [] })),
        window: { from: from ?? null, until: until ?? null, ...(soon === true ? { now: true } : {}) },
        placeId: placeIdOf(plans, restaurant, placeId),
        ...(kind === null ? {} : { cuisine: kind }),
      };
      const { location, locationMissing } = context;
      const chained = afterEarlierSteps(planInput, earlier(toolContext));
      const { answer, served, busy = [] } = await plans.planned(userId, chained, { now, location, locationMissing });
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      if (answer.noPlan !== null) {
        return { ...noneOf(answer, planInput, { now, presented }), ...busyWords(busy) };
      }
      return plannedWords(answer, served, { meal, kind });
    },
  });
}

// The rules of a meal planned on the map, a fragment of the chat's system prompt that takes the place of the meal part
// of the 공강 rules for an app that draws answers. They state each rule by what it means.
export const PLAN_RULES = `A meal is planned on the map: the server decides the Restaurant, the times, and where people meet, and the app draws the plans.

- When the User is hungry, wants a meal, or is choosing what or where to eat (배고파, 밥 먹자, 점심 같이 먹자, 뭐 먹을까, 뭐 먹지, 밥 추천해 줘, 어디서 먹지, 먹을 만한 데), on any day, alone or with Friends they name, call planMeal with the day (today when they name none), the meal only when their words name one (lunch for 점심, dinner for 저녁; left out otherwise: the server takes the one being served or the next one today, and lunch on a later day), and the Friends, each found with resolveFriend first. With no Friend it plans for the User alone. A time they name for the meal (오후 3시쯤 저녁) is from, as HH:MM, even when it is before the meal's hours: the server fits it to them. Plan first: do not ask back about the kind of food, about lunch or dinner, or about the time.
- On a later day with no meal named, the plans are lunch's: your sentence may end by saying that 저녁 plans dinner, such as "월요일 점심은 12:10에 학생회관식당에서 먹어요, 저녁이면 '저녁'이라고 해 주세요."
- The app draws the plans on the map and writes their times, ways, and minutes itself, the first one first, and the User browses the others with arrows. Your reply is one sentence about the first plan only, its Restaurant and when everyone is there, such as "12:33에 학생회관식당에서 먹어요." Write nothing more: no second sentence, no other plan, nobody's walking minutes or time to set out, nothing about the map, and nothing that was dropped. Do not call showOnMap for a plan: the app already draws it.
- When the User names a kind of food (한식, 중식, 일식, 양식, 분식), in the same message as the meal or in the next, call planMeal with the conditions on screen, if any, as they are, and cuisine set to that kind: the plans of the Restaurants that serve it come first, and the app shows that kind. When servedBy is empty, say in one sentence that none serves it then, with what the first plan serves. 'any' lets it go (아무거나).
- Each plan has its Restaurant's menu for the meal and when it closes, and the app shows the menus. When the User picks by a dish or a taste, in the same message as the meal or in the next (돈까스 먹고 싶어, 더 가벼운 걸로, 국물 있는 거), call planMeal with the conditions on screen, if any, as they are, and read the plans' menus. When one serves what they asked for, call planMeal again with the same conditions and that plan's restaurant. When none does, say so in one sentence with what the first plan serves. Never name a dish that no plan's menu has, and never answer with a list of menus or dishes in words.
- A question about what a Restaurant the User names serves (학생회관 오늘 메뉴 뭐야, 302동 저녁 뭐 나와) is a menu question, by the menu rules. Any other question about what or where to eat, menus included (오늘 점심 뭐야?), is a meal wish, planned with planMeal.
- When planMeal answers alreadySet, the User already put that meal in their schedule, and the plans are new ones that would replace it. Your reply says so and asks whether to change it, such as "이미 12:16 302동식당 점심이 있어요. 바꿀까요?": the app offers 바꾸기 and 그대로 두기. When alreadySet.shared is true, it is with others (alreadySet.with) and is changed only in that 파티, so say so instead, such as "이미 민수와 12:16 302동식당 점심이 있어요. 바꾸려면 그 파티에서 바꿔요."
- When planMeal answers related, the User already has those Quests that day, of this meal or with a Friend asked for. Your sentence mentions the one that matters, such as "민수와는 13:00에 약속이 이미 있어요", whether or not it limits the plans; never treat it as free.
- When planMeal answers none with busy, say what fills the time, by the User's own items, such as "점심 시간엔 13:00까지 수업이 있어요."
- When planMeal answers none, say plainly why. Name someone busy only if they are a Friend in the plan, and say only when their Class ends or starts, never the course or the room; never name anyone who is not the User's Friend.
- When the User asks who is free for a meal ("오늘 점심에 누구 돼?"), call findFreeFriends. Your reply says the User's Free Time in that window and the names of the Friends it returned.
- When resolveFriend answers several, ask which one ${WHICH_FRIEND}, and wait for the answer.
- Breakfast is not covered: say that lunch and dinner are.
- A line [Plan on screen: …] after the User's message gives the plan the app shows and its conditions. To change it (민수는 빼고, 지은이도 불러 줘, 12:30까지만, 학생회관에서 먹자), call planMeal again with those conditions and only that change: the same date, meal, friendIds, from, until, and placeId, except what the User changed. A Friend to add is found with resolveFriend first and added to friendIds. A Friend to take out is found with resolveFriend and left out of friendIds. An end the User names is until, and a start is from, as HH:MM. A Place to eat at is found with resolvePlace and given as placeId. To move the plan by an amount of time (10분 늦춰 줘), first call planMeal with the conditions as they are, read the start of the plan the line names, and call it again with from set to that start moved by the amount.
- A line [Tapped: friend …] gives the id of the Friend the User tapped on the map (이 사람, 얘): use it as that Friend's id. A line [Tapped: place …] gives the Place they tapped (여기): give it as placeId to eat there.
- After a change, your reply is one sentence that says what changed.`;
