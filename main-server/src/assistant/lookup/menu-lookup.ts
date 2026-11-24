/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Cuisines } from '../../menus/cuisine-words.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { dishName } from '../../menus/dish-name.js';
import { LONGEST_MEAL_SECONDS } from '../../travel/judgement-constants.js';
import { type AnswerLine, type AnswerReply, type Lookup, type MapScene, type Plan } from '../dto/answer.dto.js';
import { type LookupMenu } from '../dto/lookup.dto.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type HandledMeal } from '../free-time/meal-fit.js';
import { withTopic } from '../gathering/answer-words.js';
import { MINUTES_SAID_MAX } from '../gathering/gathering.js';
import { cornersOf, mainMenu } from '../gathering/meal-menu.js';
import { dayWordsFrom } from '../korea-time.js';
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
  // The meal's hours that day, as RestaurantHours keeps them; null when none were kept.
  hours: LookupMenu['hours'];
  // The kept kinds of food of its dishes; none read when left out.
  cuisines?: Cuisines;
}

export type MenuAnswer = { result: 'found'; plan: Plan; lookup: Lookup } | { result: 'none'; reason: 'no-time' };

// Why a menu asked of a Restaurant has no meal Plan to draw: its day not posted yet, posted without the meal, only
// notes, or no time to eat there.
export type NoMenuReason = 'no-menu' | 'no-meal' | 'closed' | 'no-time';

// The day as the meal Plan's time bar names it ("내일(수)", "11/30(월)"), and 오늘 for today (P04 ticket 60).
export const dayOf = (date: string, now: Date): string => dayWordsFrom(date, now) || '오늘';

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

const won = (price: number): string => `${price.toLocaleString('en-US')}원`;

// The dishes of the main line with their prices, "부대짬뽕&군만두 6,500원", up to DISHES_MAX.
function pricedDishes(lines: readonly MenuLineDto[]): string[] {
  const [main] = cornersOf(lines);
  return (main?.items ?? [])
    .slice(0, DISHES_MAX)
    .map((line) => (line.price === null ? dishName(line) : `${dishName(line)} ${won(line.price)}`));
}

// The meal's hours and the dishes of its main corner (`cornersOf`), each by its name and price, for the map's card of
// the Restaurant. The hours are the meal counter's, not a take-out counter's, so the dishes are its own.
function menuOf({ lines, hours, cuisines }: MenuArgs): LookupMenu {
  return { hours, dishes: mainMenu(lines, cuisines).dishes };
}

// The first line: the Restaurant, the day and meal, the first dish with its price, and how many more are served. The
// prices and the hours were in no line, and a User asked again for them and got the same card.
function firstLine({ key, date, meal, now, lines }: MenuArgs): AnswerLine {
  const [main] = cornersOf(lines);
  const [first, ...more] = main?.items ?? [];
  const dish =
    first === undefined ? '' : first.price === null ? dishName(first) : `${dishName(first)} ${won(first.price)}`;
  const rest = more.length > 0 ? ` 외 ${more.length}` : '';
  return [part(key, true), part(` ${dayOf(date, now)} ${withTopic(mealWord(meal))} ${dish}${rest}`)];
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

function linesOf(args: MenuArgs, plan: Plan): AnswerLine[] {
  return [firstLine(args), whenLine(plan)];
}

type Part = Plan['parts'][number];

// "걸어서 12분", or by the shuttle "셔틀로 12분 (301동 정류장 → 경영대 정류장)".
function thereWords(mine: Part | undefined, minutes: number): string {
  if (mine?.mode !== 'shuttle') {
    return `걸어서 ${minutes}분`;
  }
  const stops = mine.shuttle === undefined ? '' : ` (${mine.shuttle.boardAt} 정류장 → ${mine.shuttle.getOffAt} 정류장)`;
  return `셔틀로 ${minutes}분${stops}`;
}

const shuttleOn = (mine: Part | undefined, onward: Plan['scene']['routes'][number]): boolean =>
  mine?.next?.by === 'shuttle' || onward.mode === 'shuttle';

// The dishes with their prices, the walk there, then why the meal ends: the walk on to the next item, the hour a meal
// lasts at most, or the end the User set. A Restaurant's closing is when it last serves, which ends no meal.
function basisOf({ key, meal, lines: menu }: MenuArgs, plan: Plan): string[] {
  const [mine] = plan.parts;
  const origin = mine?.origin ?? null;
  const walk = mine?.walkMinutes ?? 0;
  const priced = pricedDishes(menu);
  const lines = [
    ...(priced.length === 0 ? [] : [priced.join(' · ')]),
    ...(origin !== null && walk > 0 ? [`${origin.place.label} → ${key} ${thereWords(mine, walk)}`] : []),
  ];
  const leaveBy = mine?.leaveBy ?? null;
  if (leaveBy !== plan.endAt || leaveBy === null) {
    const hour = plan.togetherMinutes >= LONGEST_MEAL_SECONDS / 60;
    return [
      ...lines,
      hour ? '식사는 한 시간으로 잡았어요' : `${withTopic(mealWord(meal))} ${clock(plan.endAt)}까지예요`,
    ];
  }
  const leaving = `${clock(leaveBy)}에 나서요`;
  const onward = plan.scene.routes.find(({ role }) => role === 'next');
  const nextPlace = mine?.next?.place ?? null;
  return [
    ...lines,
    nextPlace === null || onward === undefined
      ? leaving
      : `${nextPlace.label}까지 ${shuttleOn(mine, onward) ? '셔틀로' : '걸어서'} ${onward.minutes}분이라 ${leaving}`,
  ];
}

// The dishes as the line of the Restaurant's label, after the day and the meal when that is not today (P04 ticket 60).
function dishesLine({ date, meal, now }: Pick<MenuArgs, 'date' | 'meal' | 'now'>, dishes: readonly string[]): string {
  const day = dayWordsFrom(date, now);
  return [...(day === '' ? [] : [`${day} ${mealWord(meal)}`]), ...dishes].join(' · ');
}

// The Plan's scene without the other Restaurants, with the dishes as the line of the Restaurant's label.
function sceneOf({ scene }: Plan, text: string): MapScene {
  return {
    ...scene,
    places: scene.places.filter(({ role }) => role !== 'candidate' && role !== 'dropped'),
    flags: scene.flags.map((flag) => (flag.role === 'place' ? { ...flag, text } : flag)),
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
    lines: linesOf(args, plan),
    basis: basisOf(args, plan),
    scene: sceneOf(plan, dishesLine(args, dishes)),
    band: plan.band,
    actions: [{ kind: 'guide', to: plan.place }],
    menu: menuOf(args),
    fact: true,
  };
  return { result: 'found', plan, lookup };
}

// What the Restaurant's label says when there is no meal Plan: its day not posted yet ("내일(수) 점심 메뉴 아직 안
// 올라옴"), posted without the meal ("오늘 저녁 메뉴 없음"), the meal not served ("내일(수) 점심은 안 해요"), or, with no
// time to eat there, its dishes.
function noneState(args: Omit<MenuArgs, 'answer' | 'hours'>, reason: NoMenuReason): string {
  const { date, meal, now, lines } = args;
  const day = dayOf(date, now);
  if (reason === 'no-menu') {
    return `${day} ${mealWord(meal)} 메뉴 아직 안 올라옴`;
  }
  if (reason === 'no-meal') {
    return `${day} ${mealWord(meal)} 메뉴 없음`;
  }
  const dishes = dishesOf(lines);
  if (reason === 'closed' || dishes.length === 0) {
    return `${day} ${withTopic(mealWord(meal))} 안 해요`;
  }
  return dishesLine(args, dishes);
}

// A menu asked of a Restaurant with no meal Plan to draw still brings the Restaurant to the map (P04 ticket 59), as an
// hours answer does: picked out, its label saying why, and the dishes with their prices as the basis when there are
// some. Only a fact: the map lets it go under the next reply.
export function menuNoneLookup(
  args: Omit<MenuArgs, 'answer' | 'hours'>,
  reason: NoMenuReason,
  place: Pick<PlaceDto, 'id' | 'latitude' | 'longitude'>,
): Lookup {
  const { key } = args;
  const at = { latitude: place.latitude, longitude: place.longitude };
  const state = noneState(args, reason);
  const priced = reason === 'no-time' ? pricedDishes(args.lines) : [];
  return {
    kind: 'place',
    chips: [],
    lines: [[part(key, true)], [part(state)]],
    basis: priced.length === 0 ? [] : [priced.join(' · ')],
    scene: {
      people: [],
      places: [{ place: { placeId: place.id, label: key, ...at }, role: 'pick', tag: key }],
      routes: [],
      flags: [{ at, text: `${key} · ${state}`, role: 'place' }],
    },
    band: null,
    actions: [{ kind: 'guide', to: { placeId: place.id, label: key, ...at } }],
    fact: true,
  };
}
