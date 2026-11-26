/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MenuLineKind } from '../../generated/prisma/client.js';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { type CuisineWord, type Cuisines } from '../../menus/cuisine-words.js';
import { dishName } from '../../menus/dish-name.js';
import { servedLines } from '../../menus/open-rule.js';
import { type AnswerLine, type PlanMenu } from '../dto/answer.dto.js';
import { koreaDate } from '../korea-time.js';
import { addDays } from '../library/booking-rules.js';

// What a meal Plan says of its Restaurant's menu (design 6.1, wireframe AmHungry s1): the main dish and the closing
// time on the card, the whole menu in 근거, and the same in words for the model.

// The meal's lines at a Restaurant as collected, when it closes for the meal ("HH:MM"), null when its hours were never
// read, and the kept kinds of food of its dishes, none when left out.
export interface ServedMenu {
  lines: readonly MenuLineDto[];
  closesAt: string | null;
  cuisines?: Cuisines;
}

// A heading and the lines under it, or the lines before the first heading.
interface Corner {
  heading: MenuLineDto | null;
  items: MenuLineDto[];
}

// Plain rice beside the dishes of a buffet, which says nothing of what is served.
const STAPLES = new Set(['밥', '쌀밥', '잡곡밥', '흑미밥', '백미밥', '현미밥', '기장밥', '귀리밥']);
// A line of a buffet's notice cut in two by the page, as "<뷔페 특성상 메뉴의 조기품절".
const CUT_NOTICE = /^<|>$/u;

const SOURCE = '오늘의 식단';

// The served corners that hold something, each without plain rice when it holds more.
export function cornersOf(lines: readonly MenuLineDto[]): Corner[] {
  const corners: Corner[] = [{ heading: null, items: [] }];
  for (const line of servedLines(lines)) {
    if (line.kind === MenuLineKind.heading) {
      corners.push({ heading: line, items: [] });
    } else if (line.kind === MenuLineKind.dish || !CUT_NOTICE.test(line.text.trim())) {
      corners.at(-1)?.items.push(line);
    }
  }
  return corners.flatMap(({ heading, items }) => {
    const dishes = items.filter((line) => !STAPLES.has(dishName(line)));
    const kept = dishes.length > 0 ? dishes : items;
    return kept.length === 0 ? [] : [{ heading, items: kept }];
  });
}

// Everything served that meal, every corner's items in the menu's order: the first is the main dish, and the rest are
// the "외 N" of the menu's words.
function servedItems(lines: readonly MenuLineDto[]): MenuLineDto[] {
  return cornersOf(lines).flatMap((corner) => corner.items);
}

// The main corner, the first that holds something: its own price from its heading, and its dishes by name, price and
// kept kind of food in the menu's order, and how many other things are served (`others`, P04 ticket 74). What a meal
// Plan and a menu Lookup give the app of a Restaurant's menu.
export function mainMenu(lines: readonly MenuLineDto[], cuisines: Cuisines = new Map()): PlanMenu {
  const [main] = cornersOf(lines);
  return {
    price: main?.heading?.price ?? null,
    dishes: (main?.items ?? []).map((line) => {
      const name = dishName(line);
      return { name, price: line.price, cuisine: cuisines.get(name) ?? null };
    }),
    others: Math.max(0, servedItems(lines).length - 1),
  };
}

// The Restaurants whose main corner serves the kind of food first, each group in its order; all as they are with no kind.
export function kindFirst<Fit extends { key: string }>(
  fits: readonly Fit[],
  kind: CuisineWord | null | undefined,
  served: ReadonlyMap<string, ServedMenu> | undefined,
): Fit[] {
  const serves = ({ key }: Fit): boolean => {
    const menu = served?.get(key);
    return menu !== undefined && mainMenu(menu.lines, menu.cuisines).dishes.some(({ cuisine }) => cuisine === kind);
  };
  return kind === null || kind === undefined
    ? [...fits]
    : [...fits.filter((fit) => serves(fit)), ...fits.filter((fit) => !serves(fit))];
}

const won = (price: number): string => `${price.toLocaleString('ko-KR')}원`;

// What a meal costs there as the app's list writes it ("3,000원부터"): the corner's own price, else the lowest of its
// dishes' with 부터 when they differ; null when nothing has a price. planMeal gives it to the model, so that the reply's
// prices agree with the list (P05 ticket 50).
export function listPrice({ price, dishes }: Pick<PlanMenu, 'price' | 'dishes'>): string | null {
  if (price !== null) {
    return won(price);
  }
  const prices = dishes.flatMap((dish) => (dish.price === null ? [] : [dish.price]));
  if (prices.length === 0) {
    return null;
  }
  const lowest = Math.min(...prices);
  return prices.some((one) => one !== lowest) ? `${won(lowest)}부터` : won(lowest);
}

function itemWords(line: MenuLineDto): string {
  return line.name !== null && line.price !== null ? `${dishName(line)} ${won(line.price)}` : dishName(line);
}

function headingWords({ text }: MenuLineDto): string {
  return text
    .replaceAll(/[<>]/gu, ' ')
    .replace(/^\s*\+/u, '')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

// The whole menu, one line per corner, as 근거 shows it and the model reads it.
export function menuWords(lines: readonly MenuLineDto[]): string[] {
  return cornersOf(lines).map(({ heading, items }) => {
    const served = items.map((line) => itemWords(line)).join(' · ');
    return heading === null ? served : `${headingWords(heading)}: ${served}`;
  });
}

function dayOf(date: string, now: Date): string {
  const today = koreaDate(now);
  const named: Record<string, string> = { [today]: '오늘', [addDays(today, 1)]: '내일', [addDays(today, 2)]: '모레' };
  const [, month, day] = date.split('-').map(Number);
  return named[date] ?? `${month}월 ${day}일`;
}

// "오늘 **제육덮밥** 외 2 · 14:00까지": the first dish of the first corner, how many other things are served, and the
// closing time when it is known. Null for a menu with nothing served.
export function menuLine({ lines, closesAt }: ServedMenu, date: string, now: Date): AnswerLine | null {
  const items = servedItems(lines);
  const [first] = items;
  if (first === undefined) {
    return null;
  }
  const main = dishName(first).split(',')[0]?.trim() ?? '';
  const others = items.length > 1 ? ` 외 ${items.length - 1}` : '';
  const closing = closesAt === null ? '' : ` · ${closesAt}까지 배식`;
  const line: AnswerLine = [
    { text: `${dayOf(date, now)} `, strong: false },
    { text: main, strong: true },
  ];
  return others === '' && closing === '' ? line : [...line, { text: `${others}${closing}`, strong: false }];
}

// 근거's lines of the menu: the whole menu, then where it and the closing time come from.
export function menuBasis({ lines, closesAt }: ServedMenu): string[] {
  const words = menuWords(lines);
  if (words.length === 0) {
    return [];
  }
  return [...words, closesAt === null ? `메뉴: ${SOURCE}` : `메뉴와 배식 시각: ${SOURCE}`];
}

const wordsOf = (line: AnswerLine): string => line.map(({ text }) => text).join('');

// The Plan's lines with the menu line second, right after a first line that names the Restaurant, else last, after
// lines that say something else first (where the asker was taken to set out from). The serving end is left out of it
// when a line already says it ("302동식당은 13:30에 배식이 끝나요").
export function withMenu(
  lines: AnswerLine[],
  served: ServedMenu | undefined,
  { key, date, now }: { key: string; date: string; now: Date },
): AnswerLine[] {
  if (served === undefined) {
    return lines;
  }
  const closed = lines.some((line) => wordsOf(line).includes(key) && wordsOf(line).includes('배식'));
  const line = menuLine(closed ? { ...served, closesAt: null } : served, date, now);
  const [first, ...rest] = lines;
  if (line === null) {
    return lines;
  }
  return first !== undefined && wordsOf(first).includes(key) ? [first, line, ...rest] : [...lines, line];
}
