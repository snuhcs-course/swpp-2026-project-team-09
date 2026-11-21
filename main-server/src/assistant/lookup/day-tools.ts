/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { type DayAnswer } from './day-lookup.js';
import { type DayLookupService } from './day.service.js';

// A day's Classes drawn on the map, for an app that draws answers: the server lists them with the Free Time and the
// walks between them, the model passes the day and writes one sentence. Course names, rooms, ids, and coordinates stay
// here.

const NONE_WORDS: Record<Extract<DayAnswer, { result: 'none' }>['reason'], (date: string) => string> = {
  'no-classes': (date) => `The User has no Class and no Quest on ${date}.`,
  'not-kept': (date) => `The User has no such Quest on ${date}.`,
  ambiguous: () => 'A ref given fits more than one Quest of the day: give the full ref, or ask the User which one.',
};

export function findDay(days: DayLookupService): Tool {
  return defineTool({
    description:
      "Lists the User's day from today to a week ahead, in order: their Classes and their Quests (each Quest with its ref, kind, title, start, end, place, the others of it and how each answered, whether the User leads it (mine), and whether they may change it (changeable)), and the app draws them on the map. Give questIds to show only those Quests. Answers result 'found' with the classes, the quests, the minutes of Free Time and of each walk between the Classes; or result 'none'.",
    input: z.object({
      date: dateInput,
      questIds: z
        .array(z.string().min(8).max(36))
        .max(10)
        .optional()
        .describe(
          'The Quests the User asks about, by their ref as findDay or [Ahead: …] gives it. Left out to show the whole day.',
        ),
    }),
    run: async ({ date, questIds }, { userId, now, presented }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const answer = await days.find(userId, date, now, questIds);
      if (answer.result === 'none') {
        return noneFound(NONE_WORDS[answer.reason](date));
      }
      presented.lookup = answer.lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return { result: 'found', ...answer.words };
    },
  });
}

// The rules of a day drawn on the map, a fragment of the chat's system prompt for an app that draws answers.
export const DAY_RULES = `A day is drawn on the map: the server lists the User's Classes and Quests of a day in order at their places, with the Free Time and the walks between the Classes, and the app draws them.

- When the User asks what they have on a day (오늘 뭐 있지?, 오늘 수업 뭐 있어?, 내일 일정 알려 줘), call findDay with the day: today when they name none. Do not call getMyDay for it.
- When they ask about something already set (민수랑 약속 몇 시였지?, 점심 어디서 먹기로 했지?, 과외 몇 시였지?), find it in [Ahead: …] or an earlier findDay, and call findDay with its day and its ref as questIds. Answer from what it returns: never plan a new one for a question about what is set. When several Quests fit and the User meant one, say which they are and ask.
- The app draws them with their times and places, and writes the Free Time and the walks itself. Your reply is one sentence, such as "오늘 수업 3개와 약속 1개가 있어요." or "민수와는 내일 14:00 SK경영관 앞에서 만나요." Name only the people of the Quest asked about. Do not list everything, and do not call showOnMap for them.
- When findDay answers none, say that nothing is set that day, or that no such Quest is.`;
