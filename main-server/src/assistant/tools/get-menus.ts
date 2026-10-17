/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { Meal } from '../../generated/prisma/client.js';
import { MenusService } from '../../menus/menus.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';

const input = z.object({
  date: z.iso.date().describe('The day, a calendar day in Korea as YYYY-MM-DD.'),
  meal: z.enum(Meal).optional().describe('Only this meal. Leave it out for every meal of the day.'),
  restaurant: z
    .string()
    .min(1)
    .optional()
    .describe('Only the restaurants whose name holds these words, such as 자하연. Leave it out for every restaurant.'),
});

type Conditions = z.output<typeof input>;

// Spaces and case do not count when a name is matched.
function compact(words: string): string {
  return words.replaceAll(/\s/gu, '').toLowerCase();
}

function reasonForNone({ date, meal, restaurant }: Conditions): string {
  const where = restaurant === undefined ? 'No restaurant' : `No restaurant named ${restaurant}`;
  return meal === undefined
    ? `${where} has a menu collected for ${date}.`
    : `${where} has a ${meal} menu collected for ${date}.`;
}

// The first refining tool: the menus matching the User's conditions and nothing else, each restaurant with when its
// menus were collected, or "none" with the reason. It never answers another day's menus.
export function getMenus(menus: MenusService): Tool {
  return defineTool({
    description:
      "The menus collected for one day at the campus restaurants, each restaurant with when its menus were collected (collectedAt, Korean time). Answers result 'none' with the reason when nothing matches.",
    input,
    run: async (conditions) => {
      const { date, meal, restaurant } = conditions;
      const days = await menus.findByDate(date);
      if (days.length === 0) {
        return noneFound(`No menu was collected for ${date}.`);
      }
      const restaurants = days
        .filter(({ name }) => restaurant === undefined || compact(name).includes(compact(restaurant)))
        .map(({ name, collectedAt, meals }) => ({
          name,
          collectedAt: koreaTime(collectedAt),
          meals: meals
            .filter((served) => meal === undefined || served.meal === meal)
            .map((served) => ({ meal: served.meal, lines: served.lines.map(({ text }) => text) })),
        }))
        .filter(({ meals }) => meals.length > 0);
      return restaurants.length === 0 ? noneFound(reasonForNone(conditions)) : { result: 'found', date, restaurants };
    },
  });
}
