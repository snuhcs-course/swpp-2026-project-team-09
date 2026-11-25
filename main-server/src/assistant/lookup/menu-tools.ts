/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type MenuLineDto } from '../../menus/dto/restaurant-menus.dto.js';
import { closureNotices } from '../../menus/open-rule.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { mealWindow } from '../free-time/meal-fit.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { dayWordsFrom, koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { resolved } from '../tools/resolved.js';
import { type MenuFound, type MenuLookupService } from './menu.service.js';

// A Restaurant's menu for an app that draws answers: the server finds the Restaurant, its menu, and how long the User
// can eat there, and the app opens the meal answer at that Restaurant, its menu shown as a place opened from the list
// (P04 ticket 72); the model passes the words, and writes a sentence only when it cannot be done. Coordinates and ids
// of Places stay here.

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
  { reason, lines }: Extract<MenuFound, { result: 'none' }>,
  key: string,
  { date, meal, now }: { date: string; meal: 'lunch' | 'dinner'; now: Date },
): string {
  if (reason === 'no-menu') {
    return dayWordsFrom(date, now) === ''
      ? `${key}'s ${meal} menu for today is not posted yet. Say so; never that ${key} is closed.`
      : `${key}'s ${meal} menu for ${date} is not posted yet: menus are posted up to six days ahead. Say so, and that it comes later; never that ${key} is closed.`;
  }
  if (reason === 'no-meal') {
    return `${key} has no ${meal} menu on ${date}, though its menus of that day were collected: say there is no ${meal} menu that day, never that it is not posted yet or comes later.`;
  }
  if (reason === 'closed') {
    return closureNotices(lines).length === 0
      ? `${key} serves no ${meal} on ${date}: its ${meal} menu holds only notes.`
      : `${key} is closed for ${meal} on ${date}, as its menu's lines say: say so, with the reason they state.`;
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
      "Shows one Restaurant's menu for lunch or dinner of a day from today to a week ahead: the app opens it as a meal plan's place, with its menu, when the User is there and the way, and the button to make it. Answers result 'found' with the Restaurant, when its menu was collected (collectedAt), the menu's lines, and when the User can eat there (start, end, eatingMinutes) and from where; result 'several' with the Restaurants the words could name; or result 'none' with the reason.",
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
      presented.mapButtons.length = 0;
      if (found.result === 'none') {
        presented.lookup = found.lookup;
        presented.answer = null;
        return { ...noneFound(reasonOf(found, key, { date, meal, now })), lines: menuLines(found.lines) };
      }
      presented.answer = found.answer;
      presented.lookup = null;
      const { collectedAt, lines, plan } = found;
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
export const MENU_RULES = `A Restaurant's menu is shown by the app: the server finds the menu, the way there, and how long the User can eat before their next item, and the app shows them as that Restaurant opened from a meal plan's list, with its menu, its time, and the button to make it.

- When the User asks for the menu of a Restaurant they name (오늘 301동식당 메뉴 뭐야?, 자하연 점심 뭐 나와?), call findMenu with the day (when they name none, the day the conversation is about, such as the day of the plan on the screen or of the question before; else today), the meal (lunch or dinner; when they name none, the one being served now or the next one), and their words for the Restaurant as restaurant. Do not call getMenus for it. A line [Tapped: place …] with no Restaurant named (여기 메뉴 뭐야?) leaves restaurant out.
- Only a question about what a Restaurant the User names serves is a menu question. One that names no Restaurant (오늘 점심 뭐야?, 월요일에 뭐 먹을까, 한식 뭐 있어?) is a meal wish: call planMeal by the meal rules, whose plans carry their menus, and never list menus in words. A question about breakfast, which planMeal does not plan, is answered with getMenus.
- When findMenu answers several, ask which one, listing the names, and call it again with the name the User chose. When it answers none because no Restaurant on the map has that name, call getMenus with the same words.
- When findMenu answers found, write nothing: the app shows the menu, the time, and the way. Never list the menu or its dishes in words, and do not call showOnMap for a menu.
- When findMenu answers none, say why in one short sentence, such as "예술계식당은 오늘 휴점이에요." or "내일 점심 메뉴는 아직 안 올라왔어요.", and nothing of the menu: the app shows the menu it has, with why.
- Say when a menu was collected only when the User asks, or when it is not the menu of the day asked: this takes the place of saying collectedAt every time.`;
