/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { EVENT_IDS_MAX, type EventsInput, type Plan } from '../dto/answer.dto.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { clockOf, type DayItem } from '../free-time/free-time.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { othersText } from '../others-text.js';
import { type EventsPlanService } from './events-plan.service.js';

// The Global Events of a day planned on the map, for an app that draws them (ADR 0009): the server decides which the
// User can attend and how, the model passes the day and writes one sentence. Coordinates, ids of Places, course names,
// and rooms stay here.

const clock = (time: string | null): string | null => (time === null ? null : time.slice(11, 16));

// What the model is told of a plan, in words and minutes, with no coordinates, course names, or rooms: a clash by the
// time of the item and whether it is a Class.
function planWords({ title, place, startAt, togetherMinutes, parts }: Plan, clash: DayItem | null): object {
  return {
    title: othersText('globalEvent.title', title),
    place: othersText('globalEvent.place', place.label),
    arrive: clock(startAt),
    stayMinutes: togetherMinutes,
    leaveBy: clock(parts[0]?.leaveBy ?? null),
    clash: clash === null ? null : { at: clockOf(clash.start), with: clash.isClass ? 'Class' : 'Quest' },
  };
}

const input = z.object({
  date: dateInput,
  eventIds: z
    .array(z.uuid())
    .max(EVENT_IDS_MAX)
    .optional()
    .describe(
      'Only these Global Events, as searchGlobalEvents returned them in this message, when the User asked for a kind of event. Left out for every event of the day.',
    ),
});

export function planEvents(plans: EventsPlanService): Tool {
  return defineTool({
    description:
      "Plans the campus events (Global Events) of a day the User can attend between their Classes and Quests, from today to a week ahead. The server decides when they arrive, how long they can stay, and when they must leave, the longest stay first and those that clash with a Class last, and the app draws the plans on the map. Answers result 'planned' with the plans in order, each with its title, place, arrive, stayMinutes, leaveBy, and clash, or result 'none' with the reason.",
    input,
    run: async ({ date, eventIds }, { userId, now, context, found, presented }) => {
      if (outOfReach(date, now)) {
        presented.clears = true;
        return noDay(date);
      }
      found.refuseUnfound('globalEvent', eventIds ?? []);
      const planInput: EventsInput = { kind: 'events', date, eventIds: eventIds ?? null };
      const { answer, planning } = await plans.planned(userId, planInput, { now, location: context.location });
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      if (answer.noPlan !== null) {
        return noneFound('No event of that day can be attended between the User’s Classes and Quests.');
      }
      return {
        result: 'planned',
        plans: answer.plans.map((plan, index) => planWords(plan, planning.plans[index]?.clash ?? null)),
      };
    },
  });
}

// The rules of the events of a day planned on the map, a fragment of the chat's system prompt for an app that draws
// them. They state each rule by what it means.
export const EVENT_RULES = `The events of a day are planned on the map: the server decides which the User can attend between their Classes and Quests, when they arrive, how long they stay, and when they leave, and the app draws the plans.

- When the User asks what is on or worth seeing today or on a day (오늘 볼 만한 거 있어?, 내일 뭐 해?), call planEvents with the day (today when they name none).
- When they ask for a kind of event (공연 있어?, 채용 행사 갈 만한 거), first call searchGlobalEvents for that day with words of the kind, pick the candidates that fit, and call planEvents with the day and their ids as eventIds.
- The app draws the plans and writes their times, ways, and minutes itself, the first one first. Your reply is one sentence about the first plan only, such as "채용박람회에 13:54에 도착해서 78분 볼 수 있어요." Do not show the events with showGlobalEvents or showOnMap: the app already draws them.
- When planEvents answers none, say plainly that there is no event the User can attend that day.`;
