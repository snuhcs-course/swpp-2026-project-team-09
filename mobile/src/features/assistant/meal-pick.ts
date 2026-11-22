/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine, Plan } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';
import { travelWords } from './answer-walks';
import { menuLine } from './meal-menus';

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
