/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type MeetInput, type Plan, type RequestContext } from '../dto/answer.dto.js';
import { defineTool, type Tool } from '../feature.js';
import { clockTime, dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { askedBy } from '../refusals/friend-question.js';
import { relatedWords } from './meal-tool-words.js';
import { type MeetPlanService } from './meet-plan.service.js';
import { FRIENDS_MAX, refuseUnseen, timesAndWays } from './plan-tools.js';

// A meet planned on the map, for an app that draws it: as for a meal, the server decides when and where, and the model
// passes the User's words as conditions and writes one sentence. Coordinates, ids of Places, course names, and rooms
// stay here.

const NONE_REASONS: Record<NonNullable<AnswerReply['noPlan']>['reason'], string> = {
  'no-menu': 'There is no place to meet.',
  'no-shared-time': 'The User and the Friends share no free time that day in the window.',
  'no-fit': 'There is no place where they can be together long enough.',
};

const input = z
  .object({
    date: dateInput,
    friendIds: z
      .array(z.uuid())
      .min(1)
      .max(FRIENDS_MAX)
      .describe(
        'The Friends to meet, as resolveFriend returned them in this message, or as [Plan on screen: …] or [Tapped: friend …] gives them.',
      ),
    from: clockTime
      .optional()
      .describe('The start the User fixed, as HH:MM: nobody is there before it. Left out when they fixed none.'),
    until: clockTime
      .optional()
      .describe('The end the User fixed, as HH:MM: everyone has left by it. Left out when they fixed none.'),
    placeId: z
      .uuid()
      .optional()
      .describe(
        'The Place to meet at, as resolvePlace returned it in this message, or as [Plan on screen: …] or [Tapped: place …] gives it. Left out for any.',
      ),
  })
  .refine(({ from, until }) => from === undefined || until === undefined || from < until, 'Expected from before until');

const planWords = (plan: Plan): object => ({ place: plan.id, ...timesAndWays(plan) });

// The Friends and the Place of the meet on screen, and the ones tapped, which the model may give without resolving.
function seenIds({ conditions, tapped }: RequestContext): { friends: string[]; places: string[] } {
  const shown = conditions?.kind === 'meet' ? conditions : null;
  const placeOnScreen = shown?.placeId ?? null;
  return {
    friends: [
      ...(shown?.people.slice(1).map(({ userId }) => userId) ?? []),
      ...(tapped?.kind === 'friend' ? [tapped.userId] : []),
    ],
    places: [...(placeOnScreen === null ? [] : [placeOnScreen]), ...(tapped?.kind === 'place' ? [tapped.placeId] : [])],
  };
}

// Each person's constraints of the meet on screen, kept while it stays on the same day.
function constraintsOf(
  { conditions }: RequestContext,
  date: string,
): Map<string, MeetInput['people'][number]['constraints']> {
  if (conditions?.kind !== 'meet' || conditions.date !== date) {
    return new Map();
  }
  return new Map(conditions.people.map(({ userId, constraints }) => [userId, constraints]));
}

export function planMeet(plans: MeetPlanService): Tool {
  return defineTool({
    description:
      "Plans when the User and Friends can meet on a day from today to a week ahead, and where. The server decides the earliest time they are all free, the place where they are together longest among the places people gather and the buildings they are in, and when everyone is there, and the app draws the plans on the map. Answers result 'planned' with the plans in order, each with its place, start, end, togetherMinutes, and each person's way, or result 'none' with the reason.",
    input,
    run: async ({ date, friendIds, from, until, placeId }, { userId, now, context, found, presented }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      const seen = seenIds(context);
      askedBy('planMeet', friendIds, found, presented);
      refuseUnseen(found, 'friend', friendIds, seen.friends);
      refuseUnseen(found, 'place', placeId === undefined ? [] : [placeId], seen.places);
      const kept = constraintsOf(context, date);
      const meetInput: MeetInput = {
        kind: 'meet',
        date,
        people: [userId, ...new Set(friendIds)].map((id) => ({ userId: id, constraints: kept.get(id) ?? [] })),
        window: { from: from ?? null, until: until ?? null },
        placeId: placeId ?? null,
      };
      const answer = await plans.plan(userId, meetInput, { now, location: context.location });
      presented.answer = answer;
      presented.lookup = null;
      presented.mapButtons.length = 0;
      if (answer.noPlan !== null) {
        return { result: 'none', reason: NONE_REASONS[answer.noPlan.reason] };
      }
      return { result: 'planned', plans: answer.plans.map((plan) => planWords(plan)), ...relatedWords(answer.related) };
    },
  });
}

// The rules of a meet planned on the map, a fragment of the chat's system prompt for an app that draws it. They state
// each rule by what it means.
export const MEET_RULES = `A meet with Friends is planned on the map too: the server decides when the User and the Friends are free together, where they are together longest, and when everyone is there, and the app draws the plans.

- When the User wants to meet or see Friends they name, not for a meal (민수랑 만나고 싶어, 지은이 언제 볼 수 있어?), call planMeet with the day (today when they name none) and the Friends, each found with resolveFriend first.
- The app draws the plans and writes their times, ways, and minutes itself, the first one first. Your reply is one sentence about the first plan only, its place and when everyone is there, such as "12:15에 302동 앞에서 만나요." Write nothing more, and do not call showOnMap for a plan.
- When planMeet answers related, the User already has those Quests that day, meetings or with a Friend asked for. Your sentence mentions the one that matters, such as "민수와는 내일 14:00 SK경영관 앞에서 약속이 이미 있어요", whether or not it limits the plans.
- When planMeet answers none, say plainly why, without naming who is busy.
- A line [Plan on screen: …] whose kind is meet gives the meet the app shows. To change it (14시부터, 학생회관에서 보자, 지은이도 불러 줘), call planMeet again with its date, friendIds, from, until, and placeId, changing only what the User changed: a Friend found with resolveFriend, a Place with resolvePlace, a start as from and an end as until.
- After a change, your reply is one sentence that says what changed.`;
