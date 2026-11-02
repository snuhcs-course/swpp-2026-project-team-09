/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { type FreeInterval, onDay } from '../free-time/free-time.js';
import { dateInput } from '../free-time/tool-parts.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { clockOfMinutes, durationWords, earliestStartMinutes, windowRefusal } from './booking-rules.js';
import { type ClockRange, type LibrarySpace } from './catalogue.js';
import { bookableSpace, dayWords, type LibraryServices, refused, spaceIdInput } from './library-parts.js';

const MINUTE_MS = 60 * 1000;

const input = z.object({
  spaceId: spaceIdInput,
  date: dateInput,
  minutes: z.int().min(1).max(1440).optional().describe('The shortest stretch wanted, in minutes. 30 when not given.'),
});

function clockOf(time: number): string {
  return new Date(time + 9 * 60 * MINUTE_MS).toISOString().slice(11, 16);
}

// The stretches of Free Time the space can be booked in: within its hours and from the next 30-minute mark today,
// aligned to its steps, at least `minutes` long, and each cut to its longest booking, with the names of the items
// around it and never their Places.
function slotsOf(
  free: readonly FreeInterval[],
  {
    space,
    hours,
    date,
    now,
    minutes,
  }: { space: LibrarySpace; hours: ClockRange; date: string; now: Date; minutes: number },
): object[] {
  const step = space.stepMinutes * MINUTE_MS;
  const open = onDay(date, hours.open).getTime();
  const close = onDay(date, hours.close).getTime();
  const earliest =
    date === koreaDate(now)
      ? onDay(date, clockOfMinutes(earliestStartMinutes(now, space.stepMinutes))).getTime()
      : open;
  return free.flatMap(({ start, end, previous, next }) => {
    const from = Math.ceil(Math.max(start.getTime(), open, earliest) / step) * step;
    const to = Math.floor(Math.min(end.getTime(), close) / step) * step;
    if (to - from < minutes * MINUTE_MS) {
      return [];
    }
    const cut = Math.min(to, from + space.maxMinutes * MINUTE_MS);
    return [
      {
        start: clockOf(from),
        end: clockOf(cut),
        ...(cut < to ? { freeUntil: clockOf(to) } : {}),
        before: previous === null ? null : othersText('item.name', previous.name),
        after: next === null ? null : othersText('item.name', next.name),
      },
    ];
  });
}

// The User's Free Time that day when the space can be booked, through the FreeTimePort.
export function findLibraryFreeSlots(services: LibraryServices): Tool {
  return defineTool({
    description:
      "Finds the stretches of the User's Free Time that day (between their Classes and the Quests they hold) when the space is open and can be booked, each aligned to 30 minutes, at least `minutes` long and cut to the space's longest booking, with the names of the items before and after. Use it before proposeLibraryBooking when the User asks for a booking in their 공강 or between Classes. Answers 'found' with the slots, 'refused' with the reason, or 'none'.",
    input,
    run: async ({ spaceId, date, minutes = 30 }, context) => {
      const checked = await bookableSpace(services, spaceId, context);
      if ('answer' in checked) {
        return checked.answer;
      }
      const { space } = checked;
      const window = windowRefusal(space, date, context.now);
      if (window !== null || space.hours === null) {
        return refused(window === null ? [] : [window]);
      }
      const free = await services.freeTime.freeTimeOn(context.userId, date, context.now);
      const slots = slotsOf(free, { space, hours: space.hours, date, now: context.now, minutes });
      if (slots.length === 0) {
        const day = dayWords(date, context.now);
        return noneFound(`${day}은 ${space.name}을 예약할 수 있는 공강이 ${durationWords(minutes)} 이상 없어요.`);
      }
      return { result: 'found', date, slots };
    },
  });
}
