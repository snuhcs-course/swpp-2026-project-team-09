/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply, type Plan, type PlanInput } from '../dto/answer.dto.js';
import { defineTool, type Tool } from '../feature.js';
import { othersText } from '../others-text.js';
import { dateInput, noDay, outOfReach } from '../free-time/tool-parts.js';
import { type MealPlanService } from './meal-plan.service.js';

// A meal planned on the map, for an app that draws answers (ADR 0009): the server decides everything, the model passes
// the User's words as conditions and writes one sentence. Coordinates, ids of Places, course names, and rooms stay here.

// The most Friends of a plan, the asker making it eight people.
const FRIENDS_MAX = 7;

const NONE_REASONS: Record<NonNullable<AnswerReply['noPlan']>['reason'], string> = {
  'no-menu': 'No Restaurant is open for that meal that day, or no menu was collected for it.',
  'no-shared-time': 'There is no free time everyone shares during that meal.',
  'no-fit': 'No Restaurant can be reached, eaten at, and left in time.',
};

const clock = (time: string | null): string | null => (time === null ? null : time.slice(11, 16));

const nameOf = ({ me, name }: Plan['parts'][number]): string => (me ? '나' : othersText('friend.name', name));

function planWords(plan: Plan): object {
  const { id, startAt, endAt, togetherMinutes, meeting, parts } = plan;
  return {
    restaurant: id,
    start: clock(startAt),
    end: clock(endAt),
    togetherMinutes,
    meeting:
      meeting === null
        ? null
        : {
            at: clock(meeting.at),
            place: meeting.place.label,
            with: parts.filter(({ me, userId }) => !me && meeting.userIds.includes(userId)).map((part) => nameOf(part)),
          },
    people: parts.map((part) => ({
      name: nameOf(part),
      from: part.origin?.place.label ?? null,
      walkMinutes: part.walkMinutes,
      leaveAt: clock(part.leaveAt),
      leaveBy: clock(part.leaveBy),
    })),
  };
}

export function planMeal(plans: MealPlanService): Tool {
  return defineTool({
    description:
      "Plans a meal for the User alone or with Friends on a day from today to a week ahead. The server decides the Restaurant, when everyone is there, how long they can eat, and where they meet on the way, the longest time together first, and the app draws the plans on the map. Answers result 'planned' with the plans in order, each with its restaurant, start, end, togetherMinutes, meeting, and each person's way, and the Restaurants dropped, or result 'none' with the reason.",
    input: z.object({
      date: dateInput,
      meal: z.enum(['lunch', 'dinner']).describe('lunch or dinner.'),
      friendIds: z
        .array(z.uuid())
        .max(FRIENDS_MAX)
        .default([])
        .describe(
          'The Friends, as resolveFriend or findFreeFriends returned them in this message. None for the User alone.',
        ),
    }),
    run: async ({ date, meal, friendIds }, { userId, now, context, found, presented }) => {
      if (outOfReach(date, now)) {
        return noDay(date);
      }
      found.refuseUnfound('friend', friendIds);
      const input: PlanInput = {
        kind: 'meal',
        date,
        meal,
        people: [userId, ...new Set(friendIds)].map((id) => ({ userId: id, constraints: [] })),
        window: { from: null, until: null },
        placeId: null,
      };
      const answer = await plans.plan(userId, input, { now, location: context.location });
      presented.answer = answer;
      presented.mapButtons.length = 0;
      if (answer.noPlan !== null) {
        return { result: 'none', reason: NONE_REASONS[answer.noPlan.reason] };
      }
      return {
        result: 'planned',
        plans: answer.plans.map((plan) => planWords(plan)),
        dropped: answer.dropped.map(({ place }) => place.label),
      };
    },
  });
}

// The rules of a meal planned on the map, a fragment of the chat's system prompt that takes the place of the meal part
// of the 공강 rules for an app that draws answers. They state each rule by what it means.
export const PLAN_RULES = `A meal is planned on the map: the server decides the Restaurant, the times, and where people meet, and the app draws the plans.

- When the User is hungry or wants a meal (배고파, 밥 먹자, 점심 같이 먹자), alone or with Friends they name, call planMeal with the day (today when they name none), the meal (lunch or dinner; when they name none, the one being served now or the next one), and the Friends, each found with resolveFriend first. With no Friend it plans for the User alone. Do not ask what the User feels like first.
- The app draws the plans on the map and writes their times, ways, and minutes itself, the first one first, and the User browses the others with arrows. Your reply is one sentence about the first plan only, its Restaurant and when everyone is there, such as "12:33에 학생회관식당에서 먹어요." Write nothing more: no second sentence, no other plan, nobody's walking minutes or time to set out, nothing about the map, and nothing that was dropped. Do not call showOnMap for a plan: the app already draws it.
- When planMeal answers none, say plainly why, without naming who is busy.
- When the User asks who is free for a meal ("오늘 점심에 누구 돼?"), call findFreeFriends. Your reply says the User's Free Time in that window and the names of the Friends it returned.
- When resolveFriend answers several, call findFreeFriends for that meal, read the departments there, and name them in your question.
- Breakfast is not covered: say that lunch and dinner are.`;
