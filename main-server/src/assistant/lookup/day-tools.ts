/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { type DayLookupService } from './day.service.js';

// A day's Classes drawn on the map, for an app that draws answers: the server lists them with the Free Time and the
// walks between them, the model passes the day and writes one sentence. Course names, rooms, ids, and coordinates stay
// here.

export function findDay(days: DayLookupService): Tool {
  return defineTool({
    description:
      "Lists the User's Classes of a day from today to a week ahead, in order, and the app draws them on the map with the walks between them. Answers result 'found' with each Class's start, end, and building (place), the minutes of Free Time between them (freeMinutes), and the minutes of each walk between them (walkMinutes); or result 'none' when the User has no Class that day.",
    input: z.object({ date: dateInput }),
    run: async ({ date }, { userId, now, presented }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const answer = await days.find(userId, date, now);
      if (answer.result === 'none') {
        return noneFound(`The User has no Class on ${date}.`);
      }
      presented.lookup = answer.lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return { result: 'found', ...answer.words };
    },
  });
}

// The rules of a day's Classes drawn on the map, a fragment of the chat's system prompt for an app that draws answers.
export const DAY_RULES = `A day's Classes are drawn on the map: the server lists the User's Classes of a day in order at their buildings, with the Free Time and the walks between them, and the app draws them.

- When the User asks what Classes they have on a day (오늘 수업 뭐 있어?, 내일 수업 몇 개야?), call findDay with the day: today when they name none. Do not call getMyDay for it.
- The app draws the Classes with their times and buildings, and writes the Free Time and the walks itself. Your reply is one sentence, such as "오늘 수업은 3개예요." Do not list the Classes, and do not call showOnMap for them.
- When findDay answers none, say that the User has no Class that day.`;
