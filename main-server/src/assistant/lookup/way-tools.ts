/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { clockOf } from '../free-time/free-time.js';
import { clockTime } from '../free-time/tool-parts.js';
import { QUEST_FIELD, QUEST_NONE_REASONS, questsNamed } from './quest-way-tools.js';
import { type TutorialOrderService } from './tutorial-order.service.js';
import { atPlace, type Way } from './way.js';
import { type WayAnswer } from './way-lookup.js';
import { type WayService } from './way.service.js';

// A way drawn on the map, for an app that draws answers: the server finds where the User sets out from, the minutes on
// foot, whether the shuttle is faster, and whether they will be late, the model passes the Places and writes one
// sentence. Coordinates, ids of Places, and course names stay here.

const NONE_REASONS: Record<Extract<WayAnswer, { result: 'none' }>['reason'], string> = {
  'no-start':
    'Where the User sets out from is not known: where they are could not be matched to a Place, and no item of theirs has ended earlier today.',
  'no-next': 'The User has no item with a Place later today.',
  'past-by':
    'The time given as by is not later than now. Give it as 24-hour HH:MM (2시 in the afternoon is 14:00); if the time the User named has passed today, say so.',
};

export const STARTS: Record<Way['start']['basis'], string> = {
  location: 'where the User is now',
  chosen: 'the Place the User named',
  timetable: "the Place of the User's last item today",
  gate: 'the main gate, since the User is off campus and their location is not used',
};

const input = z.object({
  to: z
    .uuid()
    .optional()
    .describe(
      "The Place to go to, as resolvePlace returned it in this message, or as [Tapped: place …] gives it. Left out for the Place of the User's next item today.",
    ),
  from: z
    .uuid()
    .optional()
    .describe(
      'The Place the User sets out from, when they named one, as resolvePlace returned it in this message. Left out to set out from where they are.',
    ),
  by: clockTime
    .optional()
    .describe(
      'The time the User must be there by, as 24-hour HH:MM, when they named one (2시까지 in the afternoon is 14:00). Left out otherwise.',
    ),
  about: z
    .enum(['shuttle'])
    .optional()
    .describe('shuttle when the User asked about the shuttle (셔틀 언제 와?, 셔틀 탈까 걸을까). Left out otherwise.'),
  quest: QUEST_FIELD,
});

// When the User must be there and whether it is a Class, when to set out, and how late they are if they set out now.
function deadlineWords({ deadline, arrival }: Way): object | null {
  if (deadline === null) {
    return null;
  }
  const { at, isClass, leaveBy, lateMinutes } = deadline;
  return {
    at: clockOf(at),
    isClass,
    leaveBy: clockOf(leaveBy),
    arrivalIfLeavingNow: clockOf(arrival),
    lateMinutes,
  };
}

// The shuttle weighed against the walk: whether it is taken, its stops, when to set out for it, when it comes and
// what that rests on, and the arrival by it.
function shuttleWords({ shuttle }: Way): object | string | null {
  if (shuttle === null) {
    return null;
  }
  if (shuttle === 'not running') {
    return 'not running now';
  }
  const { trip, taken, lateMinutes } = shuttle;
  return {
    taken,
    boardAt: `${trip.stops[0]?.name ?? ''} 정류장`,
    getOffAt: `${trip.stops.at(-1)?.name ?? ''} 정류장`,
    leaveAt: clockOf(trip.leave),
    comesAt: clockOf(trip.comes),
    comesBy: trip.passed === null ? 'the average wait at this hour' : `the shuttle that passed ${trip.passed}`,
    arrival: clockOf(trip.arrival),
    lateMinutes,
  };
}

export function findWay(ways: WayService, tutorial: TutorialOrderService): Tool {
  return defineTool({
    description:
      "Finds the way from where the User is to a Place, or to the Place of their next item today, on foot or by the campus shuttle when it is at least 3 minutes faster, and the app draws it on the map. Answers result 'found' with where the User sets out from, the Place, the minutes on foot, the shuttle weighed against the walk, and, when they must be there by a time, when to set out and how many minutes late they are if they set out now, or result 'none' with the reason." +
      questsNamed(tutorial),
    input,
    run: async ({ to, from, by, about, quest }, { userId, now, context, found, presented }) => {
      const tapped = context.tapped?.kind === 'place' ? context.tapped.placeId : null;
      found.refuseUnfound(
        'place',
        [to, from].flatMap((placeId) => (placeId === undefined || placeId === tapped ? [] : [placeId])),
      );
      if (quest !== undefined) {
        const reached = await tutorial.wayTo(
          userId,
          { questKey: quest, fromPlaceId: from ?? null },
          { now, location: context.location },
        );
        if (reached.result === 'none') {
          return noneFound(QUEST_NONE_REASONS[reached.reason]);
        }
        presented.lookup = reached.lookup;
        presented.answer = null;
        presented.mapButtons.length = 0;
        return { result: 'found', fromIs: STARTS[reached.way.start.basis], ...reached.words };
      }
      const answer = await ways.find(
        userId,
        { fromPlaceId: from ?? null, toPlaceId: to ?? null, by: by ?? null, about },
        { now, location: context.location },
      );
      if (answer.result === 'none') {
        return noneFound(NONE_REASONS[answer.reason]);
      }
      const { way, lookup, labels } = answer;
      presented.lookup = lookup;
      presented.answer = null;
      presented.mapButtons.length = 0;
      return {
        result: 'found',
        ...labels,
        fromIs: STARTS[way.start.basis],
        ...(atPlace(way) ? { atPlace: true } : {}),
        walkMinutes: way.walkMinutes,
        deadline: deadlineWords(way),
        shuttle: shuttleWords(way),
      };
    },
  });
}

// The rules of a way drawn on the map, a fragment of the chat's system prompt for an app that draws answers.
export const WAY_RULES = `A way is drawn on the map: the server finds where the User sets out from, the way, the minutes on foot, whether the shuttle is faster, and whether they will be late, and the app draws them.

- When the User asks where a Place is (문화관이 어디야?, 24동 어떻게 가?), or how many minutes it takes to a Place (24동까지 몇 분?), find the Place with resolvePlace first, then call findWay with it as to. When they name where they set out from (301동에서), find that Place with resolvePlace too and give it as from.
- When the User asks how many minutes it takes to their next Class, whether they will be late, or whether to take the shuttle (늦나?, 다음 수업까지 몇 분?, 9시 수업인데 늦나, 셔틀 탈까 걸을까), call findWay with to left out: the server takes the Place of their next item today. A time they must be there by (2시까지) is by, as 24-hour HH:MM: 2시 in the afternoon is 14:00.
- When the User asks about the shuttle to a Place or to their next Class (기숙사 가는 셔틀 언제 와?, 셔틀 탈까 걸을까), give about 'shuttle' to findWay, which then says first when the shuttle is not running.
- A line [Tapped: place …] gives the Place the User tapped (여기): give it as to.
- The app draws the way and writes its minutes and times itself. Your reply is one sentence, such as "문화관은 지금 있는 301동에서 걸어서 18분이에요.", "12:45에 나서면 13:00 수업에 맞아요.", "지금 가도 5분 늦어요.", or, when the shuttle is taken, "16:43에 나서 셔틀을 타면 16:53에 도착해요." When findWay gives atPlace, the User is there already: say so, such as "지금 24동에 있어요." Do not call showOnMap for a way: the app already draws it.
- When findWay answers none because it does not know where the User sets out from, ask where they set out from. When it answers none because there is no next item, say that they have nothing later today.`;
