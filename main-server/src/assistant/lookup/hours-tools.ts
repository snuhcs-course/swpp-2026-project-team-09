/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { resolved } from '../tools/resolved.js';
import { hoursWords } from './hours-words.js';
import { type MenuLookupService } from './menu.service.js';

// When a Restaurant opens, closes, and serves each meal on a day, answered in words. A meal plan on screen is planned
// again from its conditions, so that the reply keeps it there.

const input = z.object({
  date: dateInput,
  restaurant: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe(
      "The User's words for the Restaurant, as written, such as 예술계 or 301동식당. Left out for the Restaurant at the Place of [Tapped: place …].",
    ),
});

export function restaurantHours(menus: Pick<MenuLookupService, 'named' | 'at' | 'mealsOf' | 'replan'>): Tool {
  return defineTool({
    description:
      "When a Restaurant serves each meal on a day from today to a week ahead: for each meal it serves, opensAt and closesAt; a meal it serves with hours not recorded, with the menu's notes; a meal it does not serve that day, with why; and, today, now and the meal it is serving now (servingNow, null when none). Answers result 'several' with the Restaurants the words could name, or 'none' with the reason.",
    input,
    run: async ({ date, restaurant }, { userId, now, context, presented }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const tapped = context.tapped?.kind === 'place' ? context.tapped.placeId : null;
      const names = restaurant === undefined ? (tapped === null ? null : menus.at(tapped)) : menus.named(restaurant);
      if (names === null) {
        return noneFound('Give the words of the Restaurant the User named.');
      }
      const chosen = resolved(
        names.map((name) => ({ name })),
        restaurant === undefined
          ? 'No Restaurant stands at the Place the User tapped.'
          : `No Restaurant on the map has a name holding ${restaurant}.`,
      );
      if (chosen.result !== 'one') {
        return chosen;
      }
      const key = chosen.candidate.name;
      const { conditions, location } = context;
      if (conditions?.kind === 'meal' && presented.answer === null) {
        presented.answer = await menus.replan(userId, conditions, { now, location });
      }
      return hoursWords(key, date, now, await menus.mealsOf(key, date));
    },
  });
}

// The rules of a Restaurant's hours, a fragment of the chat's system prompt for an app that draws answers.
export const HOURS_RULES = `A Restaurant's hours are answered in words.

- When the User asks when a Restaurant opens, closes, or serves a meal, or whether it is open now (예술계 밥 언제까지 해?, 학생회관 몇 시에 열어?, 301동식당 지금 열었어?, 자하연 저녁 하나?), call restaurantHours with the day (today when they name none) and their words for the Restaurant. Do not call findMenu or planMeal for it: a meal plan on the screen stays there.
- Answer in one or two plain sentences from its meals, the meal asked for first, such as "예술계식당 점심은 11:30부터 14:00까지예요. 저녁은 17:00–18:30이에요." For 지금 열었어?, say from servingNow whether it is serving now, and when it opens or closes next.
- A meal with hours not recorded: say that it serves that meal that day and that its hours are not known, and give the time a note of its menu states, if one does. A meal it does not serve that day: say so. A meal whose day's menu is not collected yet: give its usual hours as the usual ones. Never say that the hours are not in the data when restaurantHours gave them.`;
