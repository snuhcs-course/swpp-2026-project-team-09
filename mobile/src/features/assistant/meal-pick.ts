/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine, Plan } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';
import { travelWords } from './answer-walks';
import { dishesFirstOf, dishWords, menuLine } from './meal-menus';

// The two-line name label of a meal answer's pick (the answer screen's redesign, board E1): its name with its time and
// way ("학생회관식당 11:00 · 걸음 32분", or "· 이동 32분 · 셔틀" with a leg by shuttle), then its main dish, the count of the rest, and the lowest price.
export function mealPickWords(
  plan: Plan,
  title: string,
  kind: Cuisine | null,
): { name: string; title: string; note: string; line: string | null; action: string } {
  const way = travelWords(plan);
  const note = [koreaClock(plan.startAt), ...(way === null ? [] : [way])].join(' · ');
  const line = menuLine(plan.menu, kind);
  return { name: [title, note, ...(line === null ? [] : [line])].join(' · '), title, note, line, action: '메뉴 ›' };
}

// The chosen place's label on the map (P04 ticket 74): its name and its start ("예술계식당 17:00"), the walk being the
// route's own pill, then its main dish, the first of the kind on screen when one is chosen, with the main server's count
// of the other things served ("콘마요핫도그 외 2"); one thing alone, the dish alone; no menu, no second line. A main
// server without that count leaves the menu's own words. A screen reader reads it whole, walk and price included.
export function mealPickLabel(
  plan: Plan,
  title: string,
  kind: Cuisine | null,
): { name: string; title: string; note: string; line: string | null; action: string } {
  const { name, action } = mealPickWords(plan, title, kind);
  return { name, title, note: koreaClock(plan.startAt), line: mainDishOf(plan.menu, kind), action };
}

function mainDishOf(menu: Plan['menu'], kind: Cuisine | null): string | null {
  if (menu === undefined) {
    return null;
  }
  if (menu.others === undefined) {
    return dishWords(menu, kind);
  }
  const [first] = dishesFirstOf(menu.dishes, kind);
  const dish = first?.name.split(',')[0]?.trim() ?? '';
  if (dish === '') {
    return null;
  }
  return menu.others === 0 ? dish : `${dish} 외 ${String(menu.others)}`;
}
