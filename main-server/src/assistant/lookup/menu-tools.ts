/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { resolved } from '../tools/resolved.js';
import { type MenuFound, type MenuLookupService } from './menu.service.js';

// A Restaurant's menu drawn on the map, for an app that draws answers: the server finds the Restaurant, its menu, and
// how long the User can eat there, the model passes the words and writes one sentence. Coordinates and ids of Places
// stay here.

const input = z.object({
  date: dateInput,
  meal: z.enum(['lunch', 'dinner']).describe('lunch or dinner.'),
  restaurant: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe(
      "The User's words for the Restaurant, as written, such as 301동식당 or 자하연. Left out for the Restaurant at the Place of [Tapped: place …].",
    ),
});

const clock = (time: string): string => time.slice(11, 16);

const menuLines = (lines: readonly MenuLineDto[]): string[] => lines.map(({ text }) => othersText('menu.line', text));

function reasonOf(
  { reason }: Extract<MenuFound, { result: 'none' }>,
  key: string,
  { date, meal, now }: { date: string; meal: 'lunch' | 'dinner'; now: Date },
): string {
  if (reason === 'no-menu') {
    return `No ${meal} menu of ${key} was collected for ${date}.`;
  }
  if (reason === 'closed') {
    return `${key} serves no ${meal} on ${date}: its ${meal} menu holds only notes.`;
  }
  if (mealWindow(date, meal).end <= now) {
    return `The ${meal} of ${date} is over; ${key}'s menu is in lines.`;
  }
  return `The User has no free time during ${meal} on ${date} to be at ${key} and eat; its menu is in lines.`;
}

// The Restaurants the words name, else those at the Place the User tapped; null with neither.
function namesOf(menus: MenuLookupService, words: string | undefined, tapped: string | null): string[] | null {
  if (words !== undefined) {
    return menus.named(words);
  }
  return tapped === null ? null : menus.at(tapped);
}

export function findMenu(menus: MenuLookupService): Tool {
  return defineTool({
    description:
      "Shows one Restaurant's menu for lunch or dinner of a day from today to a week ahead, and the app draws it on the map with the way there and how long the User can eat before their next item. Answers result 'found' with the Restaurant, when its menu was collected (collectedAt), the menu's lines, and when the User can eat there (start, end, eatingMinutes) and from where; result 'several' with the Restaurants the words could name; or result 'none' with the reason.",
    input,
    run: async ({ date, meal, restaurant }, { userId, now, context, presented }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const names = namesOf(menus, restaurant, context.tapped?.kind === 'place' ? context.tapped.placeId : null);
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
      const found = await menus.find(userId, { date, meal, key }, { now, location: context.location });
      if (found.result === 'none') {
        return { ...noneFound(reasonOf(found, key, { date, meal, now })), lines: menuLines(found.lines) };
      }
      const { collectedAt, lines, plan, lookup } = found;
      presented.lookup = lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      const [mine] = plan.parts;
      return {
        result: 'found',
        restaurant: key,
        collectedAt: koreaTime(collectedAt),
        lines: menuLines(lines),
        start: clock(plan.startAt),
        end: clock(plan.endAt),
        eatingMinutes: plan.togetherMinutes,
        from: mine?.origin?.place.label ?? null,
        walkMinutes: mine?.walkMinutes ?? null,
      };
    },
  });
}

// The rules of a Restaurant's menu drawn on the map, a fragment of the chat's system prompt for an app that draws
// answers.
export const MENU_RULES = `A Restaurant's menu is drawn on the map: the server finds the menu, the way there, and how long the User can eat before their next item, and the app draws them.

- When the User asks for the menu of a Restaurant they name (오늘 301동식당 메뉴 뭐야?, 자하연 점심 뭐 나와?), call findMenu with the day (today when they name none), the meal (lunch or dinner; when they name none, the one being served now or the next one), and their words for the Restaurant as restaurant. Do not call getMenus for it. A line [Tapped: place …] with no Restaurant named (여기 메뉴 뭐야?) leaves restaurant out.
- A question about menus that names no Restaurant (오늘 점심 뭐야?), and one about breakfast, is answered with getMenus as before.
- When findMenu answers several, ask which one, listing the names, and call it again with the name the User chose. When it answers none because no Restaurant on the map has that name, call getMenus with the same words.
- The app draws the Restaurant with its menu and writes the time to eat itself. Your reply is one sentence, such as "301동식당 오늘 점심은 제육볶음이에요." Do not call showOnMap for a menu: the app already draws it.
- When findMenu answers none, say plainly why; when the User has no time to eat there, still say the menu from its lines.
- For a menu findMenu drew, say when it was collected only when the User asks, or when it is not the menu of the day asked: this takes the place of saying collectedAt every time.`;
