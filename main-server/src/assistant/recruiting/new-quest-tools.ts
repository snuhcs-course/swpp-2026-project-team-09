/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { QuestBoard } from '../../generated/prisma/client.js';
import { type NewQuestInput, type Plan, QUEST_IDS_MAX } from '../dto/answer.dto.js';
import { defineTool, noneFound, type Tool, type ToolContext } from '../feature.js';
import { clockTime, dateInput, outOfReach, outOfReachDay } from '../free-time/tool-parts.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { skipFor, skipParameters } from '../free-time/left-out-classes.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { type PlanAnswersService } from '../plan-answers.service.js';
import { offerPicks, PICK_NOTE, PICK_PLACE, pickTime } from '../tools/pick-offers.js';
import { CAPACITY_MIN } from './new-quest-answer.js';

// A new recruiting Quest planned on the map, for an app that draws it (ADR 0009): the server decides its Place when the
// User named none, its time, who of the Friends comes, and each way; the model passes what the User said and writes one
// sentence. Making it is the User's press. Coordinates and ids of Places stay here.

// The most Friends of a plan, and the most the server puts in an activity's plan of those free then.
const FRIENDS_MAX = 7;
const FREE_FRIENDS_MAX = CAPACITY_MIN - 1;
const TITLE_MAX = 50;

const clock = (time: string | null | undefined): string | null =>
  time === null || time === undefined ? null : time.slice(11, 16);

const input = z
  .object({
    date: dateInput,
    globalEventId: z
      .uuid()
      .optional()
      .describe(
        'For this Global Event, at its Place: as resolveGlobalEvent or searchGlobalEvents returned it in this message, from [Cards shown: …], or as [Plan on screen: …] gives it.',
      ),
    title: z
      .string()
      .trim()
      .min(1)
      .max(TITLE_MAX)
      .optional()
      .describe("What the 파티 is for, in the User's words (배드민턴, 탁구), when it is for no Global Event."),
    placeId: z
      .uuid()
      .optional()
      .describe(
        'The Place the User named, as resolvePlace returned it in this message, or as [Plan on screen: …] or [Tapped: place …] gives it. Left out for a Global Event, or to meet where the 파티 of questIds meet.',
      ),
    questIds: z
      .array(z.uuid())
      .max(QUEST_IDS_MAX)
      .optional()
      .describe(
        'The 파티 searchRecruitingQuests returned in this message for the same activity, when the User named no Place: the new one meets where they all meet.',
      ),
    time: clockTime
      .optional()
      .describe('The time the User named, as HH:MM. Left out for the earliest everyone can be there.'),
    friendIds: z
      .array(z.uuid())
      .max(FRIENDS_MAX)
      .optional()
      .describe(
        'The Friends the User named, as resolveFriend returned them in this message, or as [Plan on screen: …] gives them. Left out, a 파티 for an activity takes in the Friends free then.',
      ),
    board: z
      .enum(QuestBoard)
      .optional()
      .describe(
        'The Board it is posted on: meal (식사), career (커리어), hobby (취미, 운동 among them) or show (공연·전시). Left out for hobby.',
      ),
    ...skipParameters,
  })
  .refine(({ globalEventId, title }) => globalEventId !== undefined || title !== undefined, {
    message: 'Give globalEventId, or title for an activity',
  });

type Given = z.output<typeof input>;

// An id is taken when a tool returned it in this message, or when it is on screen or tapped.
function refuseUnseen({ found, context }: ToolContext, { friendIds = [], placeId, questIds = [] }: Given): void {
  const { conditions, tapped } = context;
  const shown = conditions?.kind === 'new-quest' ? conditions : null;
  const friends = shown?.people.slice(1).map(({ userId }) => userId) ?? [];
  const places = shown?.placeId === null || shown === null ? [] : [shown.placeId];
  if (tapped?.kind === 'friend') {
    friends.push(tapped.userId);
  }
  if (tapped?.kind === 'place') {
    places.push(tapped.placeId);
  }
  found.refuseUnfound(
    'friend',
    friendIds.filter((id) => !friends.includes(id)),
  );
  found.refuseUnfound('place', placeId === undefined || places.includes(placeId) ? [] : [placeId]);
  found.refuseUnfound('quest', questIds);
}

// What the model is told of the plan, in words and minutes, with no coordinates.
function planWords({ title, place, startAt, togetherMinutes, parts, candidates }: Plan, forEvent: boolean): object {
  return {
    title: forEvent ? othersText('globalEvent.title', title) : title,
    place: forEvent ? othersText('globalEvent.place', place.label) : place.label,
    start: clock(startAt),
    stayMinutes: togetherMinutes,
    people: parts.map(({ name, me, leaveAt, walkMinutes, mode }) => ({
      name: me ? null : name,
      me,
      setOut: clock(leaveAt),
      minutes: walkMinutes,
      by: mode ?? 'walk',
    })),
    capacity: Math.max(CAPACITY_MIN, parts.length),
    couldCome: (candidates ?? []).map(({ name }) => name),
  };
}

// `days`: the asker's day, whose Free Time the time wheel marks when the User must say when (P05 ticket 24).
export function planNewQuest(plans: PlanAnswersService, days: Pick<UserDayService, 'itemsOn'>): Tool {
  return defineTool({
    description:
      "Plans a new recruiting 파티 (an Open Quest) the User would make: for a Global Event at its Place, or for an activity at the Place the User named or where the 파티 a search returned for it all meet. The server decides the time (the one named, or the earliest everyone can be there rounded up to 10 minutes), each person's way, and the Friends free then, and the app draws the plan with its button to make it. Answers result 'planned' with the plan's title, place, start, stayMinutes, people, capacity, and the Friends who could come; 'needs-place' or 'needs-time' when the User must say where or when; or 'none' with the reason.",
    input,
    run: async (given, context) => {
      const { userId, now, context: request, presented } = context;
      if (outOfReach(given.date, now)) {
        return outOfReachDay(given.date, presented);
      }
      refuseUnseen(context, given);
      const placeId = given.globalEventId === undefined ? await placeOf(plans, userId, given, now) : null;
      if (given.globalEventId === undefined && placeId === null) {
        const shown = await offerPicks(context, () => Promise.resolve([PICK_PLACE]));
        return {
          result: 'needs-place',
          reason: 'The 파티 of the search meet at different Places, or none was given. Ask the User where.',
          ...(shown ? { note: PICK_NOTE } : {}),
        };
      }
      if (given.globalEventId === undefined && given.time === undefined && given.date !== koreaDate(now)) {
        const shown = await offerPicks(context, async () => [await pickTime(days, userId, given.date, now)]);
        const reason = 'A 파티 on another day needs a time. Ask the User when.';
        return { result: 'needs-time', reason, ...(shown ? { note: PICK_NOTE } : {}) };
      }
      const asking = { userId, date: given.date, context: request, presented };
      const skip = await skipFor(plans.newQuests.classesOn, asking, given);
      if ('result' in skip) {
        return skip;
      }
      const at = { now, location: request.location, skipped: skip.skipped };
      const first = inputOf(userId, given, placeId, given.friendIds ?? []);
      let answer = await plans.newQuests.plan(userId, first, at);
      const free = answer.plans[0]?.candidates ?? [];
      if (given.globalEventId === undefined && given.friendIds === undefined && free.length > 0) {
        const friendIds = free.slice(0, FREE_FRIENDS_MAX).map(({ userId: id }) => id);
        answer = await plans.newQuests.plan(userId, inputOf(userId, given, placeId, friendIds), at);
      }
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      const [plan] = answer.plans;
      if (plan === undefined) {
        return { ...noneFound('Not everyone of the 파티 can be there then.'), ...skip.said };
      }
      return { result: 'planned', plan: planWords(plan, given.globalEventId !== undefined), ...skip.said };
    },
  });
}

function inputOf(userId: string, given: Given, placeId: string | null, friendIds: readonly string[]): NewQuestInput {
  return {
    kind: 'new-quest',
    date: given.date,
    globalEventId: given.globalEventId ?? null,
    title: given.globalEventId === undefined ? (given.title ?? null) : null,
    placeId,
    time: given.time ?? null,
    people: [userId, ...new Set(friendIds)].map((id) => ({ userId: id, constraints: [] })),
    ...(given.board === undefined ? {} : { board: given.board }),
  };
}

// The Place named, or the one where the 파티 of the search all meet.
function placeOf(plans: PlanAnswersService, userId: string, given: Given, now: Date): Promise<string | null> {
  return given.placeId === undefined
    ? plans.quests.meetingPlace(userId, given.questIds ?? [], now)
    : Promise.resolve(given.placeId);
}
