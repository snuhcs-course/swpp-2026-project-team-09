/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine, Plan } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';
import { addedWalk } from './answer-walks';
import { menuLine } from './meal-menus';

// The two-line name label of a meal answer's pick (the answer screen's redesign, board E1): its name with its time and
// walking ("학생회관식당 11:00 · 걸음 32분"), then its main dish, the count of the rest, and the lowest price.
export function mealPickWords(
  plan: Plan,
  title: string,
  kind: Cuisine | null,
): { name: string; title: string; note: string; line: string | null } {
  const walk = addedWalk(plan);
  const note = [koreaClock(plan.startAt), ...(walk === null ? [] : [`걸음 ${String(walk)}분`])].join(' · ');
  const line = menuLine(plan.menu, kind);
  return { name: [title, note, ...(line === null ? [] : [line])].join(' · '), title, note, line };
}
