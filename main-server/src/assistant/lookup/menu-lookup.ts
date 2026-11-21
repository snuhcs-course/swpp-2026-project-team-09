/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type AnswerLine, type AnswerReply, type Lookup, type MapScene, type Plan } from '../dto/answer.dto.js';
import { type HandledMeal } from '../free-time/meal-fit.js';
import { withTopic } from '../gathering/answer-words.js';
import { MINUTES_SAID_MAX } from '../gathering/gathering.js';
import { cornersOf, dishName } from '../gathering/meal-menu.js';
import { dayWords } from '../library/library-parts.js';
import { part } from './way-naming.js';

// A Restaurant's menu drawn on the map: the meal Plan for the User alone at its Place says when they can be there and
// how long they can eat, so that it agrees with "배고파", and the menu's main line goes beside the Restaurant. Nothing
// here is sent to the model.

export interface MenuArgs {
  // The Restaurant, by its key.
  key: string;
  date: string;
  meal: HandledMeal;
  now: Date;
  // The meal's lines as collected, notes included.
  lines: readonly MenuLineDto[];
  // The meal Plan for the User alone at the Restaurant's Place.
  answer: AnswerReply;
}

export type MenuAnswer = { result: 'found'; plan: Plan; lookup: Lookup } | { result: 'none'; reason: 'no-time' };

// The label beside the Restaurant is one line on the map.
const DISHES_MAX = 3;

const clock = (time: string): string => time.slice(11, 16);

const mealWord = (meal: HandledMeal): string => (meal === 'lunch' ? '점심' : '저녁');

// The dishes of the main line: the first corner that holds one (`cornersOf`), each by its name without its price, as
// a meal Plan's menu line names the first.
export function dishesOf(lines: readonly MenuLineDto[]): string[] {
  const [main] = cornersOf(lines);
  return (main?.items ?? []).slice(0, DISHES_MAX).map((line) => dishName(line));
}

// When the User can eat there: the minutes up to two hours, else from the start until they must leave for their next
// item, or until the meal ends.
function whenLine({ startAt, endAt, parts, togetherMinutes }: Plan): AnswerLine {
  if (togetherMinutes <= MINUTES_SAID_MAX) {
    return [part(`${clock(endAt)}까지 ${togetherMinutes}분 먹을 수 있어요`)];
  }
  const leaves = parts[0]?.leaveBy === endAt;
  return [part(leaves ? `${clock(startAt)}부터 · ${clock(endAt)}엔 나서요` : `${clock(startAt)}–${clock(endAt)}`)];
}

function linesOf({ key, date, meal, now }: MenuArgs, plan: Plan, dishes: readonly string[]): AnswerLine[] {
  return [
    [part(key, true), part(` ${dayWords(date, now)} ${withTopic(mealWord(meal))} ${dishes[0] ?? ''}`)],
    whenLine(plan),
  ];
}

// The walk there, then why the meal ends: the walk on to the next item, or the end of the meal's hours.
function basisOf({ key, meal }: MenuArgs, plan: Plan): string[] {
  const [mine] = plan.parts;
  const origin = mine?.origin ?? null;
  const walk = mine?.walkMinutes ?? 0;
  const lines = origin !== null && walk > 0 ? [`${origin.place.label} → ${key} 걸어서 ${walk}분`] : [];
  const leaveBy = mine?.leaveBy ?? null;
  if (leaveBy !== plan.endAt || leaveBy === null) {
    return [...lines, `${withTopic(mealWord(meal))} ${clock(plan.endAt)}까지예요`];
  }
  const leaving = `${clock(leaveBy)}에 나서요`;
  const onward = plan.scene.routes.find(({ role }) => role === 'next');
  const nextPlace = mine?.next?.place ?? null;
  return [
    ...lines,
    nextPlace === null || onward === undefined
      ? leaving
      : `${nextPlace.label}까지 걸어서 ${onward.minutes}분이라 ${leaving}`,
  ];
}

// The Plan's scene without the other Restaurants, with the dishes as the line of the Restaurant's label.
function sceneOf({ scene }: Plan, dishes: readonly string[]): MapScene {
  return {
    ...scene,
    places: scene.places.filter(({ role }) => role !== 'candidate' && role !== 'dropped'),
    flags: scene.flags.map((flag) => (flag.role === 'place' ? { ...flag, text: dishes.join(' · ') } : flag)),
  };
}

export function menuAnswer(args: MenuArgs): MenuAnswer {
  const plan = args.answer.plans.find(({ id }) => id === args.key);
  if (plan === undefined) {
    return { result: 'none', reason: 'no-time' };
  }
  const dishes = dishesOf(args.lines);
  const lookup: Lookup = {
    kind: 'menu',
    chips: args.answer.chips,
    lines: linesOf(args, plan, dishes),
    basis: basisOf(args, plan),
    scene: sceneOf(plan, dishes),
    band: plan.band,
    actions: [{ kind: 'guide', to: plan.place }],
  };
  return { result: 'found', plan, lookup };
}
