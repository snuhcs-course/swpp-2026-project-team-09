/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { resolved } from '../tools/resolved.js';
import { hoursLookup } from './hours-lookup.js';
import { hoursWords } from './hours-words.js';
import { type MenuLookupService } from './menu.service.js';

// When a Restaurant opens, closes, and serves each meal on a day: the Restaurant on the map with its state now. The
// question is about the Restaurant, so it takes the place of a meal plan on screen (P04 ticket 59).

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
  meal: z
    .enum(['breakfast', 'lunch', 'dinner'])
    .optional()
    .describe(
      'The meal the User asked about, such as dinner for 저녁은?. Left out when they asked of the Restaurant as a whole.',
    ),
});

export function restaurantHours(menus: Pick<MenuLookupService, 'named' | 'at' | 'mealsOf' | 'placeOf'>): Tool {
  return defineTool({
    description:
      "When a Restaurant serves each meal on a day from today to a week ahead: for each meal it serves, opensAt and closesAt, or byCorner, the times its menu's notes give with the corner each belongs to; a meal it serves with hours not recorded, with the menu's notes; a meal it does not serve that day, with why; and, today, now and the meal it is serving now (servingNow, null when none). Answers result 'several' with the Restaurants the words could name, or 'none' with the reason.",
    input,
    run: async ({ date, restaurant, meal }, { now, context, presented }) => {
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
      const cells = await menus.mealsOf(key, date);
      const found = hoursWords(key, date, now, cells);
      const place = menus.placeOf(key);
      if (found.result === 'found' && place !== null) {
        presented.lookup = hoursLookup(found, place, now, { meal, cells });
        presented.answer = null;
        presented.mapButtons.length = 0;
      }
      return found;
    },
  });
}

// The rules of a Restaurant's hours, a fragment of the chat's system prompt for an app that draws answers.
export const HOURS_RULES = `A Restaurant's hours are answered in words, and the app shows the Restaurant on the map.

- When the User asks when a Restaurant opens, closes, or serves a meal, or whether it is open now (예술계 밥 언제까지 해?, 학생회관 몇 시에 열어?, 301동식당 지금 열었어?, 자하연 저녁 하나?), call restaurantHours with the day (when they name none, the day the conversation is about, such as the day of the plan on the screen or of the question before; else today), their words for the Restaurant, and the meal when they ask about one. A follow-up about another meal or day of the same Restaurant (저녁은?, 내일은?) calls restaurantHours again with it, never words alone: the map's label then speaks of what was asked. Do not call findMenu or planMeal for it, also with a meal plan on the screen: the Restaurant asked about takes its place.
- Answer in one or two plain sentences from its meals, the meal asked for first, naming the day when it is not today (내일 302동식당 점심은 …), such as "예술계식당 점심은 11:30부터 14:00까지예요. 저녁은 17:00–18:30이에요." For 지금 열었어?, say from servingNow whether it is serving now, and when it opens or closes next.
- A meal with byCorner gives the times its menu's notes state, each with the corner it belongs to: say them as times, such as "점심은 11:30부터예요. A코너는 14:00, B코너는 13:00까지 해요.", never that the hours are not recorded beside times you then give. A meal with hours not recorded and no times: say that it serves that meal that day and that its hours are not known. A meal it does not serve that day: say so, and when its why says its menu closes it, give the reason its notes state, such as "내일 302동식당 저녁은 공대수시면접으로 휴점이에요." A meal whose day's menu is not collected yet: give its usual hours as the usual ones. Never say that the hours are not in the data when restaurantHours gave them, and do not advise checking with the Restaurant unless nothing at all is known. The app shows the Restaurant on the map with its state now: do not describe the map.`;
