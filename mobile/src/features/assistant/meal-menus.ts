/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine, MenuDish, Plan } from '@/api/assistant-types';
import type { MenuLine } from '@/api/menu-types';
import { won } from '@/features/dining/adapter';

export type PlanMenu = NonNullable<Plan['menu']>;

// The dishes in the menu's order, those of `kind` first.
export function dishesFirstOf(dishes: readonly MenuDish[], kind: Cuisine | null): MenuDish[] {
  if (kind === null) {
    return [...dishes];
  }
  return [...dishes.filter(({ cuisine }) => cuisine === kind), ...dishes.filter(({ cuisine }) => cuisine !== kind)];
}

// "뚝배기불고기 외 2", or the one dish's name; null without dishes.
export function dishWords({ dishes }: PlanMenu, kind: Cuisine | null = null): string | null {
  const [first, ...rest] = dishesFirstOf(dishes, kind);
  if (first === undefined) {
    return null;
  }
  return rest.length === 0 ? first.name : `${first.name} 외 ${rest.length}`;
}

// What a meal costs there: the corner's own price (a buffet's), else the lowest of the dishes' with "부터" when they
// differ; null when nothing has a price.
export function priceWords({ price, dishes }: PlanMenu): string | null {
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

// A candidate's second line: its first dish, the count of the rest, and its price ("뚝배기불고기 외 2 · 5,000원부터").
// Null without a menu or dishes.
export function menuLine(menu: PlanMenu | undefined, kind: Cuisine | null = null): string | null {
  if (menu === undefined) {
    return null;
  }
  const dishes = dishWords(menu, kind);
  if (dishes === null) {
    return null;
  }
  const price = priceWords(menu);
  return price === null ? dishes : `${dishes} · ${price}`;
}

// The hours a meal's lines give in their note ("※ 운영시간 : 11:30~13:30" → "11:30–13:30"), null for none.
export function hoursOf(lines: readonly MenuLine[]): string | null {
  for (const { text, kind } of lines) {
    const found =
      kind === 'note' && text.includes('운영시간') ? /(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/u.exec(text) : null;
    if (found !== null) {
      return `${found[1] ?? ''}–${found[2] ?? ''}`;
    }
  }
  return null;
}

// A corner of a restaurant's menu (board E4): its title and price, the dishes it serves in one flowing line, and the
// dishes ordered one by one, each with its price.
export interface MenuCorner {
  // "코너 A", "뷔페", "주문하는 메뉴"; null for the dishes before any heading.
  title: string | null;
  price: number | null;
  served: string[];
  ordered: { name: string; price: number }[];
}

// A heading's words without its brackets and its price: "<셀프코너> 7,000원" → "셀프코너".
function cornerTitle(text: string): string {
  const words = text
    .replaceAll(/[\d,]+\s*원/gu, '')
    .replaceAll(/[<>[\]【】]/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
  return words === '' ? text.trim() : words;
}

function corner(title: string | null, price: number | null): MenuCorner {
  return { title, price, served: [], ordered: [] };
}

// The meal's lines as corners: a heading starts one, a dish with its price is ordered there, and any other line is
// served there. Notes are left out. A corner with nothing in it is dropped.
export function cornersOf(lines: readonly MenuLine[]): MenuCorner[] {
  const corners: MenuCorner[] = [corner(null, null)];
  for (const line of lines) {
    const last = corners.at(-1) ?? corner(null, null);
    if (line.kind === 'heading') {
      corners.push(corner(cornerTitle(line.text), line.price));
    } else if (line.kind === 'note') {
      continue;
    } else if (line.name !== null && line.price !== null) {
      last.ordered.push({ name: line.name, price: line.price });
    } else if (line.text.trim() !== '') {
      last.served.push(line.text.trim());
    }
  }
  return corners.filter(({ served, ordered }) => served.length > 0 || ordered.length > 0);
}

// A Plan's own menu as one corner, when the day's menus have no lines for its restaurant: its price and dishes.
export function planCorner({ price, dishes }: PlanMenu): MenuCorner {
  const ordered = dishes.flatMap(({ name, price: one }) =>
    price === null && one !== null ? [{ name, price: one }] : [],
  );
  const served = dishes.filter((dish) => price !== null || dish.price === null).map(({ name }) => name);
  return { title: null, price, served, ordered };
}
