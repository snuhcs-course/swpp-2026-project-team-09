/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { dishName } from '../../menus/dish-name.js';
import { closureNotices } from '../../menus/open-rule.js';
import { type AnswerReply, type Lookup, type Plan } from '../dto/answer.dto.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type HandledMeal, mealWindow } from '../free-time/meal-fit.js';
import { withTopic } from '../gathering/answer-words.js';
import { cornersOf } from '../gathering/meal-menu.js';
import { dayWordsFrom } from '../korea-time.js';

// A menu question's answer (P04 ticket 72): the meal's answer for the User alone, as planMeal plans it, opened at the
// Restaurant asked about, which the app shows as a place opened from that answer's list; when the Restaurant is none of
// its Plans, the Restaurant brought to the map with its menu and why it cannot be done. Nothing here is sent to the
// model.

export interface MenuArgs {
  // The Restaurant, by its key.
  key: string;
  date: string;
  meal: HandledMeal;
  now: Date;
  // The meal's lines as collected, notes included.
  lines: readonly MenuLineDto[];
  // The meal's answer for the User alone, every Restaurant they can eat at among its Plans.
  answer: AnswerReply;
}

export type MenuAnswer = { result: 'found'; plan: Plan; answer: AnswerReply } | { result: 'none'; reason: 'no-time' };

// Why a menu asked of a Restaurant has no meal Plan to draw: its day not posted yet, posted without the meal, only
// notes, or no time to eat there.
export type NoMenuReason = 'no-menu' | 'no-meal' | 'closed' | 'no-time';

// The day as the meal Plan's time bar names it ("내일(수)", "11/30(월)"), and 오늘 for today (P04 ticket 60).
export const dayOf = (date: string, now: Date): string => dayWordsFrom(date, now) || '오늘';

// The label beside the Restaurant is one line on the map.
const DISHES_MAX = 3;

const mealWord = (meal: HandledMeal): string => (meal === 'lunch' ? '점심' : '저녁');

// The dishes of the main line: the first corner that holds one (`cornersOf`), each by its name without its price, as
// a meal Plan's menu line names the first.
export function dishesOf(lines: readonly MenuLineDto[]): string[] {
  const [main] = cornersOf(lines);
  return (main?.items ?? []).slice(0, DISHES_MAX).map((line) => dishName(line));
}

// The meal answer opened at the Restaurant asked about, whose Plan is the one for it; none when it is none of the
// answer's Plans, as when the User has no time to eat there.
export function menuAnswer({ key, answer }: MenuArgs): MenuAnswer {
  const plan = answer.plans.find(({ id }) => id === key);
  if (plan === undefined) {
    return { result: 'none', reason: 'no-time' };
  }
  return { result: 'found', plan, answer: { ...answer, opened: plan.id } };
}

// The dishes as the line of the Restaurant's label, after the day and the meal when that is not today (P04 ticket 60).
function dishesLine({ date, meal, now }: Pick<MenuArgs, 'date' | 'meal' | 'now'>, dishes: readonly string[]): string {
  const day = dayWordsFrom(date, now);
  return [...(day === '' ? [] : [`${day} ${mealWord(meal)}`]), ...dishes].join(' · ');
}

// What the Restaurant's label says when there is no meal Plan: its day not posted yet ("내일(수) 점심 메뉴 아직 안
// 올라옴"), posted without the meal ("오늘 저녁 메뉴 없음"), the meal not served ("내일(수) 점심은 안 해요"), or, with no
// time to eat there, its dishes.
function noneState(args: Omit<MenuArgs, 'answer'>, reason: NoMenuReason): string {
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

// Why the Restaurant cannot be done, in a few words for the head of its menu: closed by its menu's notice ("오늘
// 휴점"), the meal not served, no time to eat there, the meal over, or its menu not posted.
export function whyOf({ date, meal, now, lines }: Omit<MenuArgs, 'answer' | 'key'>, reason: NoMenuReason): string {
  const day = dayOf(date, now);
  if (reason === 'closed') {
    return closureNotices(lines).length > 0 ? `${day} 휴점` : `${day} ${withTopic(mealWord(meal))} 안 해요`;
  }
  if (reason === 'no-time') {
    return mealWindow(date, meal).end <= now ? `${mealWord(meal)} 시간이 지났어요` : '시간이 안 맞아요';
  }
  return reason === 'no-menu' ? '메뉴가 아직 안 올라왔어요' : `${mealWord(meal)} 메뉴가 없어요`;
}

// A menu asked of a Restaurant with no meal Plan to draw still brings the Restaurant to the map (P04 ticket 59), as an
// hours answer does: picked out, its label saying why. The app shows its menu with why in its head (`menuView`, P04
// ticket 72), and no main button: only a fact, which the map lets go under the next reply.
export function menuNoneLookup(
  args: Omit<MenuArgs, 'answer'>,
  reason: NoMenuReason,
  place: Pick<PlaceDto, 'id' | 'latitude' | 'longitude'>,
): Lookup {
  const { key, date, meal } = args;
  const at = { latitude: place.latitude, longitude: place.longitude };
  const state = noneState(args, reason);
  return {
    kind: 'place',
    chips: [],
    lines: [],
    basis: [],
    scene: {
      people: [],
      places: [{ place: { placeId: place.id, label: key, ...at }, role: 'pick', tag: key }],
      routes: [],
      flags: [{ at, text: `${key} · ${state}`, role: 'place' }],
    },
    band: null,
    actions: [{ kind: 'guide', to: { placeId: place.id, label: key, ...at } }],
    fact: true,
    menuView: { restaurant: key, date, meal, why: whyOf(args, reason) },
  };
}
